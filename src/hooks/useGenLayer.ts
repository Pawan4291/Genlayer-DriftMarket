"use client";
/**
 * useGenLayer — writes to the DriftMarket contract via MetaMask.
 * Uses genlayer-js createClient with the user's MetaMask address for signing.
 */
import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined) ?? undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProvider = any;

function getEthereumProvider(): AnyProvider {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: unknown }).ethereum;
}

export function useGenLayer(walletAddress: string | null) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  function requireContract(): `0x${string}` {
    if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
    return CONTRACT_ADDRESS;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getClient(forWrite = false): ReturnType<typeof createClient> {
    const provider = getEthereumProvider();
    if (forWrite && !provider) throw new Error("MetaMask not detected");
    if (forWrite && !walletAddress) throw new Error("Wallet not connected");

    const config = {
      chain: testnetBradbury,
      ...(forWrite && {
        account: walletAddress as `0x${string}`,
        provider: provider as AnyProvider,
      }),
    };
    return createClient(config);
  }

  const createListing = useCallback(
    async (params: {
      title: string;
      description: string;
      floorPriceWei: string;
      supply: number;
      feeWei?: string;
      imageUrl?: string;
    }): Promise<string> => {
      setIsPending(true);
      setError(null);
      try {
        const client = getClient(true);
        const txHash = await client.writeContract({
          address: requireContract(),
          functionName: "create_listing",
          args: [params.title, params.description, params.floorPriceWei, params.supply],
          value: BigInt(params.feeWei ?? "0"),
        });
        await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 60,
          interval: 5000,
        });
        setLastTxHash(txHash as string);
        // Trigger sync after listing
        await fetch("/api/sync", { method: "POST" }).catch(() => {});
        return txHash as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress]
  );

  const buyListing = useCallback(
    async (params: { listingId: number; priceWei: string }): Promise<string> => {
      setIsPending(true);
      setError(null);
      try {
        const client = getClient(true);
        const txHash = await client.writeContract({
          address: requireContract(),
          functionName: "buy",
          args: [params.listingId],
          value: BigInt(params.priceWei),
        });
        await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 60,
          interval: 5000,
        });
        setLastTxHash(txHash as string);
        return txHash as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress]
  );

  const delistListing = useCallback(
    async (params: { listingId: number }): Promise<string> => {
      setIsPending(true);
      setError(null);
      try {
        const client = getClient(true);
        const txHash = await client.writeContract({
          address: requireContract(),
          functionName: "delist",
          args: [params.listingId],
          value: BigInt(0),
        });
        await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: 60,
          interval: 5000,
        });
        setLastTxHash(txHash as string);
        return txHash as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress]
  );

  return {
    createListing,
    buyListing,
    delistListing,
    isPending,
    error,
    lastTxHash,
    clearError: () => setError(null),
  };
}
