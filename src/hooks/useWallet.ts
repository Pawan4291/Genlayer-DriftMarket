"use client";
import { useState, useEffect, useCallback } from "react";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const BRADBURY_CHAIN_ID = 4221;
const BRADBURY_CHAIN = {
  chainId: `0x${BRADBURY_CHAIN_ID.toString(16)}`,
  chainName: "Genlayer Bradbury Testnet",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
};

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getProvider = () =>
    typeof window !== "undefined" ? (window as Window & { ethereum?: unknown }).ethereum : null;

  const updateAccount = useCallback(async () => {
    const provider = getProvider() as { request: (args: { method: string }) => Promise<string[]> } | null;
    if (!provider) return;
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      setAddress(accounts[0] ?? null);
    } catch {
      setAddress(null);
    }
  }, []);

  const updateChain = useCallback(async () => {
    const provider = getProvider() as { request: (args: { method: string }) => Promise<string> } | null;
    if (!provider) return;
    try {
      const id = await provider.request({ method: "eth_chainId" });
      setChainId(parseInt(id, 16));
    } catch {
      setChainId(null);
    }
  }, []);

  useEffect(() => {
    updateAccount();
    updateChain();

    const provider = getProvider() as {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    } | null;
    if (!provider) return;

    const handleAccounts = (accounts: unknown) => {
      const accs = accounts as string[];
      setAddress(accs[0] ?? null);
    };
    const handleChain = (id: unknown) => {
      setChainId(parseInt(id as string, 16));
    };

    provider.on?.("accountsChanged", handleAccounts);
    provider.on?.("chainChanged", handleChain);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, [updateAccount, updateChain]);

  const connect = useCallback(async () => {
    const provider = getProvider() as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    } | null;

    if (!provider) {
      setError("MetaMask not detected. Please install MetaMask to use DriftMarket.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAddress(accounts[0] ?? null);

      // Try switching to Bradbury testnet
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BRADBURY_CHAIN.chainId }],
        });
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number };
        if (err?.code === 4902) {
          // Chain not added yet — add it
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [BRADBURY_CHAIN],
          });
        }
      }

      await updateChain();
    } catch (err: unknown) {
      const e = err as { message?: string; code?: number };
      if (e?.code !== 4001) {
        setError(e?.message ?? "Connection failed");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [updateChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  return {
    address,
    isConnected: !!address,
    isConnecting,
    chainId,
    connect,
    disconnect,
    error,
  };
}
