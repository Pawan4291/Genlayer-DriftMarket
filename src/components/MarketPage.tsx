"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RefreshCw, TrendingUp, Package, Clock, ArrowRight } from "lucide-react";
import ListingCard, { type ListingData } from "./ListingCard";
import AnimatedBackground from "./AnimatedBackground";
import { useGenLayer } from "@/hooks/useGenLayer";

interface PricePoint {
  id: number;
  cycleNumber: number;
  priceBeforeWei: string;
  priceAfterWei: string;
  adjustmentPercent: number | null;
  reasoning: string | null;
  recordedAt: string;
}

interface MarketPageProps {
  walletAddress: string | null;
}

type FilterMode = "all" | "active" | "mine";
type SortMode = "newest" | "price-asc" | "price-desc" | "sold";

export default function MarketPage({ walletAddress }: MarketPageProps) {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [priceHistories, setPriceHistories] = useState<Record<number, PricePoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("active");
  const [sort, setSort] = useState<SortMode>("newest");
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [delistingId, setDelistingId] = useState<number | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { buyListing, delistListing } = useGenLayer(walletAddress);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const loadListings = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const url =
        filter === "active"
          ? "/api/listings?active=true"
          : filter === "mine" && walletAddress
          ? `/api/listings?seller=${walletAddress}`
          : "/api/listings";
      const res = await fetch(url);
      const data = await res.json();
      const rows: ListingData[] = data.listings ?? [];
      setListings(rows);

      // Load price history for all listings in parallel
      const histories: Record<number, PricePoint[]> = {};
      await Promise.all(
        rows.map(async (l) => {
          try {
            const r = await fetch(`/api/price-history/${l.id}`);
            const d = await r.json();
            histories[l.id] = d.priceHistory ?? [];
          } catch {
            histories[l.id] = [];
          }
        })
      );
      setPriceHistories(histories);
    } catch {
      showToast("Failed to load listings", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, walletAddress]);

  useEffect(() => {
    loadListings();
    const interval = setInterval(() => loadListings(true), 30_000);
    return () => clearInterval(interval);
  }, [loadListings]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      await loadListings(true);
      showToast("Synced from chain ✓");
    } catch {
      showToast("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleBuy = async (listingId: number, priceWei: string, quantity: number) => {
    setBuyingId(listingId);
    try {
      const txHash = await buyListing({ listingId, priceWei, quantity });
      await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, listingId, buyer: walletAddress }),
      });
      showToast(`Purchase confirmed! Tx: ${txHash.slice(0, 10)}…`);
      await loadListings(true);
    } catch (err) {
      showToast((err as Error).message ?? "Purchase failed", "error");
    } finally {
      setBuyingId(null);
    }
  };

  const handleDelist = async (listingId: number) => {
    setDelistingId(listingId);
    try {
      const txHash = await delistListing({ listingId });
      await fetch("/api/delist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, listingId, seller: walletAddress }),
      });
      showToast("Delisted successfully");
      await loadListings(true);
    } catch (err) {
      showToast((err as Error).message ?? "Delist failed", "error");
    } finally {
      setDelistingId(null);
    }
  };

  const handleAgentCycle = async (listingId: number) => {
    setAgentId(listingId);
    try {
      const res = await fetch("/api/agent-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const result = data.results?.[0];
      if (result) {
        const pct = result.adjustmentPercent;
        const pctStr = pct !== null ? (pct >= 0 ? "+" : "") + pct + "%" : "";
        showToast(`AI consensus: price drifted ${pctStr} ✓`);
      }
      await loadListings(true);
    } catch (err) {
      showToast((err as Error).message ?? "Agent cycle failed", "error");
    } finally {
      setAgentId(null);
    }
  };

  const filtered = listings
    .filter((l) => {
      if (!search) return true;
      return (
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case "price-asc": return Number(a.currentPrice) - Number(b.currentPrice);
        case "price-desc": return Number(b.currentPrice) - Number(a.currentPrice);
        case "sold": return Number(b.sold) - Number(a.sold);
        default: return b.id - a.id;
      }
    });

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.active).length,
    totalSold: listings.reduce((s, l) => s + Number(l.sold), 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero section */}
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-black min-h-[280px] flex items-center"
        >
          {/* Animated particle background */}
          <AnimatedBackground />

          {/* Background image overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/images/drift-hero-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.25,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

          {/* Content */}
          <div className="relative z-10 p-8 sm:p-12">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/70 font-mono mb-5 border border-white/10"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Live · GenLayer testnet-bradbury
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl sm:text-6xl font-black text-white mb-3 leading-none tracking-tight"
            >
              Prices drift
              <br />
              <span className="text-white/40">by AI consensus</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/50 max-w-sm text-sm sm:text-base leading-relaxed mb-6"
            >
              Every price change is a real validator vote on-chain.
              No timers. No simulations. Optimistic Democracy.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-6"
            >
              {[
                { label: "Listings", value: stats.total, icon: Package },
                { label: "Active", value: stats.active, icon: TrendingUp },
                { label: "NFTs Sold", value: stats.totalSold, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 text-white/60">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-sm font-mono">
                    <span className="text-white font-bold">{value}</span> {label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Floating price bubble */}
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="relative"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-32 h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white/40 text-xs font-mono mb-1">AI Price</div>
                  <div className="text-white text-2xl font-black">±drift</div>
                </div>
              </div>
              {/* Orbiting dot */}
              <motion.div
                className="absolute w-3 h-3 bg-green-400 rounded-full"
                style={{ top: "50%", left: "50%", marginTop: -6, marginLeft: -6, transformOrigin: "68px 0px" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-black/10 rounded-xl focus:outline-none focus:border-black/30 bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-black/5 rounded-xl">
          {(["all", "active", "mine"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-black text-white shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              {f === "mine" ? "My Listings" : f === "active" ? "Active" : "All"}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="px-3 py-2.5 text-sm border border-black/10 rounded-xl bg-white focus:outline-none focus:border-black/30"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="sold">Most Sold</option>
        </select>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 border border-black/10 rounded-xl text-sm hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          Sync Chain
        </button>
      </div>

      {/* Results count */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-black/30 font-mono mb-4"
        >
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
          {agentId !== null && (
            <span className="ml-3 text-black/60">
              · Running AI cycle for #{agentId}…
            </span>
          )}
        </motion.div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              className="border border-black/5 rounded-2xl h-72 bg-black/[0.02]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-28"
        >
          <div className="w-20 h-20 border border-black/8 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Package className="w-9 h-9 text-black/15" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            {search ? "No matches" : "No listings yet"}
          </h3>
          <p className="text-sm text-black/40 mb-8 max-w-xs mx-auto">
            {search
              ? "Try different keywords or clear the search."
              : "Deploy the contract and create the first listing. Every listing you see will be a real on-chain entry."}
          </p>
          {!search && (
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors"
            >
              Open GenLayer Studio
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing, i) => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <ListingCard
                  listing={listing}
                  walletAddress={walletAddress}
                  onBuy={handleBuy}
                  onDelist={handleDelist}
                  onAgentCycle={handleAgentCycle}
                  priceHistory={priceHistories[listing.id] ?? []}
                  isBuying={buyingId === listing.id}
                  isDelisting={delistingId === listing.id}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* How it works — shown when empty */}
      {!loading && filtered.length === 0 && !search && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {[
            {
              step: "01",
              title: "Create Listing",
              desc: "Submit title, description, floor price. A real on-chain tx is recorded.",
            },
            {
              step: "02",
              title: "AI Validators Vote",
              desc: "GenLayer validators run LLM inference, reach consensus on price drift via Optimistic Democracy.",
            },
            {
              step: "03",
              title: "Price Moves On-Chain",
              desc: "The adjustment_percent is applied deterministically — no randomness, no mocks.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="p-6 border border-black/8 rounded-2xl">
              <div className="text-4xl font-black text-black/8 mb-3">{step}</div>
              <h4 className="font-semibold mb-2">{title}</h4>
              <p className="text-sm text-black/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl z-50 max-w-sm text-center ${
              toastMsg.type === "error"
                ? "bg-red-500 text-white"
                : "bg-black text-white"
            }`}
          >
            {toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
