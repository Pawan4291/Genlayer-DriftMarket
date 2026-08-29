/**
 * Typed wrapper around the 6 DriftMarket contract methods.
 * All functions are server-side only.
 */
import { TransactionStatus } from "genlayer-js/types";
import { getReadClient, getWriteClient, CONTRACT_ADDRESS } from "./client";

export interface ChainListing {
  seller: string;
  title: string;
  description: string;
  floor_price: string;
  current_price: string;
  supply: string;
  max_per_wallet: string;
  sold: string;
  cycles_run: string;
  active: boolean;
}

type GenLayerHash = `0x${string}` & { length: 66 };

function requireAddress(): `0x${string}` {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set — deploy the contract first"
    );
  }
  return CONTRACT_ADDRESS;
}

function safeStr(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return v.toString();
  if (typeof v === "string") return v;
  return String(v ?? "0");
}

function normalizeListing(raw: unknown): ChainListing {
  const r = raw as Record<string, unknown>;
  return {
    seller: String(r.seller ?? ""),
    title: String(r.title ?? ""),

    description: String(r.description ?? ""),
    floor_price: safeStr(r.floor_price),
    current_price: safeStr(r.current_price),
    supply: safeStr(r.supply),
    max_per_wallet: safeStr(r.max_per_wallet ?? 0),
    sold: safeStr(r.sold),
    cycles_run: safeStr(r.cycles_run),
    active: Boolean(r.active),

  };
}

/** Read total number of listings from chain */
export async function totalListings(): Promise<number> {
  const client = getReadClient();
  const result = await client.readContract({
    address: requireAddress(),
    functionName: "total_listings",
    args: [],
  });
  return Number(result);
}

/** Read a single listing by on-chain index */
export async function getListing(listingId: number): Promise<ChainListing> {
  const client = getReadClient();
  const result = await client.readContract({
    address: requireAddress(),
    functionName: "get_listing",
    args: [listingId],
  });
  return normalizeListing(result);
}

/** Read all listings by iterating total_listings then get_listing */
export async function getAllListings(): Promise<Array<ChainListing & { id: number }>> {
  const total = await totalListings();
  const results: Array<ChainListing & { id: number }> = [];
  for (let i = 0; i < total; i++) {
    const listing = await getListing(i);
    results.push({ ...listing, id: i });
  }
  return results;
}

/**
 * Submit a signed run_agent_cycle() transaction.
 * Returns the tx hash on success.
 * Requires AGENT_SERVICE_PRIVATE_KEY.
 */
export async function runAgentCycle(listingId: number): Promise<string> {
  const client = getWriteClient();
  const txHash = await client.writeContract({
    address: requireAddress(),
    functionName: "run_agent_cycle",
    args: [listingId],
    value: BigInt(0),
  });
  await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 5000,
  });
  return txHash as string;
}

/** Get a transaction details by hash */
export async function getTransactionDetails(txHash: string) {
  const client = getReadClient();
  // Cast to satisfy GenLayer's branded Hash type
  return client.getTransaction({ hash: txHash as GenLayerHash });
}
