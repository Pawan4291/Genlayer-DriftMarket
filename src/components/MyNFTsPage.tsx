"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ExternalLink, Tag, RefreshCw, Package } from "lucide-react";
import { weiToGen, shortAddr, relativeTime } from "@/lib/format";
import ListingCard, { type ListingData } from "./ListingCard";
import { useGenLayer } from "@/hooks/useGenLayer";

interface Purchase {
  id: number;
  listingId: number;
  txHash: string;
  buyer: string;
  seller: string;
  titleSnapshot: string;
  priceAtPurchaseWei: string;
  purchasedAt: string;
}

interface MyNFTsPageProps {
  walletAddress: string | null;
  onConnect: () => Promise<void>;
  onNavigate: (page: string) => void;
}

export default function MyNFTsPage({ walletAddress, onConnect, onNavigate }: MyNFTsPageProps) {
  const [subTab, setSubTab] = useState<"listings" | "purchases">("listings");
  const [myListings, setMyListings] = useState<ListingData[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [delistingId, setDelistingId] = useState<number | null>(null);

  const { delistListing } = useGenLayer(walletAddress);
  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer-bradbury.genlayer.com";

  const loadPurchases = useCallback(async (showRefresh = false) => {
    if (!walletAddress) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/purchases?buyer=${walletAddress}`);
      const data = await res.json();
      setPurchases(data.purchases ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress]);

  const loadMyListings = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`/api/listings?seller=${walletAddress}`);
      const data = await res.json();
      setMyListings(data.listings ?? []);
    } catch {
      setMyListings([]);
    }
  }, [walletAddress]);

  const handleDelist = async (listingId: number) => {
    setDelistingId(listingId);
    try {
      const txHash = await delistListing({ listingId });
      await fetch("/api/delist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, listingId, seller: walletAddress }),
      });
      await loadMyListings();
    } finally {
      setDelistingId(null);
    }
  };

  useEffect(() => {
    loadPurchases();
    loadMyListings();
  }, [loadPurchases, loadMyListings]);

  if (!walletAddress) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Connect to view your NFTs</h2>
        <p className="text-sm text-black/50 mb-8">
          Connect your MetaMask wallet to see your listings and purchase history.
          Every item shown here traces to a real confirmed transaction.
        </p>
        <button
          onClick={onConnect}
          className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-black/80 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My NFTs</h1>
          <p className="text-sm text-black/50 mt-0.5 font-mono">
            {shortAddr(walletAddress)}
          </p>
        </div>
        <button
          onClick={() => {
            loadPurchases(true);
            loadMyListings();
          }}
          disabled={refreshing}
          className="p-2 border border-black/10 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-black/5 rounded-xl mb-6 w-fit">
        {(["listings", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              subTab === t ? "bg-black text-white" : "text-black/50 hover:text-black"
            }`}
          >
            {t === "listings" ? "My Listings" : "My Purchases"}
          </button>
        ))}
      </div>

      {subTab === "listings" && (
        myListings.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-7 h-7 text-black/20 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
            <p className="text-sm text-black/50 mb-6">
              NFTs you create appear here.
            </p>
            <button
              onClick={() => onNavigate("create")}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors"
            >
              Create a Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {myListings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                walletAddress={walletAddress}
                onBuy={async () => {}}
                onDelist={handleDelist}
                isDelisting={delistingId === l.id}
              />
            ))}
          </div>
        )
      )}

      {subTab === "purchases" && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl border border-black/5 bg-black/[0.02] animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 border border-black/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-black/20" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
            <p className="text-sm text-black/50 mb-6">
              When you buy NFTs from the market, they appear here.
              Each purchase is a real confirmed transaction.
            </p>
            <button
              onClick={() => onNavigate("market")}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors"
            >
              Browse Market
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {purchases.map((purchase, i) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-black/10 rounded-2xl p-5 bg-white hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{purchase.titleSnapshot}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-black/30" />
                        <span className="text-xs text-black/40 font-mono">#{purchase.listingId}</span>
                      </div>
                    </div>
                    <a
                      href={`${explorerUrl}/tx/${purchase.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-black/5 rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-black/40" />
                    </a>
                  </div>

                  <div className="bg-black/[0.03] rounded-xl p-3 mb-3">
                    <div className="text-xs text-black/40 mb-0.5">Paid at purchase</div>
                    <div className="text-xl font-bold">
                      {weiToGen(purchase.priceAtPurchaseWei)}{" "}
                      <span className="text-sm font-normal text-black/40">GEN</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-black/40">
                    <div className="flex items-center gap-1">
                      <span>From {shortAddr(purchase.seller)}</span>
                    </div>
                    <span>{relativeTime(purchase.purchasedAt)}</span>
                  </div>

                  <div className="mt-2 font-mono text-xs text-black/20 truncate">
                    {purchase.txHash.slice(0, 10)}…{purchase.txHash.slice(-6)}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )
      )}
    </div>
  );
}