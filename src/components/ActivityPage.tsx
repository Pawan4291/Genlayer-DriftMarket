"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ShoppingCart, Plus, Minus, RefreshCw, ExternalLink } from "lucide-react";
import { weiToGen, shortAddr, relativeTime, fmtPct } from "@/lib/format";

interface ActivityEvent {
  id: number;
  listingId: number;
  txHash: string;
  eventType: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  listingTitle: string | null;
}

const EVENT_ICONS = {
  create: Plus,
  buy: ShoppingCart,
  agent_cycle: TrendingUp,
  delist: Minus,
};

const EVENT_LABELS = {
  create: "New Listing",
  buy: "Purchase",
  agent_cycle: "AI Price Drift",
  delist: "Delisted",
};

const EVENT_COLORS = {
  create: "bg-blue-50 text-blue-700",
  buy: "bg-green-50 text-green-700",
  agent_cycle: "bg-black/5 text-black/70",
  delist: "bg-red-50 text-red-700",
};

type FilterType = "all" | "create" | "buy" | "agent_cycle" | "delist";

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer-bradbury.genlayer.com";

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const url = filter !== "all"
        ? `/api/activity?type=${filter}&limit=100`
        : "/api/activity?limit=100";
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data.activity ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-sm text-black/50 mt-0.5">
            Real on-chain events — each row traces to a tx hash
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 border border-black/10 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-black/5 rounded-xl mb-6 overflow-x-auto">
        {(["all", "create", "buy", "agent_cycle", "delist"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
              filter === f ? "bg-black text-white" : "text-black/50 hover:text-black"
            }`}
          >
            {f === "agent_cycle" ? "AI Drift" : EVENT_LABELS[f as keyof typeof EVENT_LABELS] ?? f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-black/5 bg-black/[0.02] animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-black/40">
          <p>No activity yet. Create a listing or make a purchase to see events here.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {events.map((event, i) => {
              const Icon = EVENT_ICONS[event.eventType as keyof typeof EVENT_ICONS] ?? TrendingUp;
              const colorClass = EVENT_COLORS[event.eventType as keyof typeof EVENT_COLORS] ?? "bg-black/5 text-black/70";
              const label = EVENT_LABELS[event.eventType as keyof typeof EVENT_LABELS] ?? event.eventType;
              const meta = event.metadata as Record<string, unknown> ?? {};
              const adjPct = meta.adjustment_percent as number | null;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 p-4 border border-black/5 rounded-xl hover:border-black/10 transition-colors bg-white group"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{label}</span>
                      {event.listingTitle && (
                        <span className="text-xs text-black/40 truncate max-w-[200px]">
                          — {event.listingTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.actor && (
                        <span className="text-xs text-black/40 font-mono">
                          {shortAddr(event.actor)}
                        </span>
                      )}
                      {event.eventType === "agent_cycle" && adjPct !== null && adjPct !== undefined && (
                        <span className={`text-xs font-mono font-medium ${
                          adjPct > 0 ? "text-green-600" : adjPct < 0 ? "text-red-600" : "text-black/40"
                        }`}>
                          {fmtPct(adjPct)}
                        </span>
                      )}
                      {event.eventType === "buy" && typeof meta.price === "string" && (
                        <span className="text-xs text-black/40 font-mono">
                          {weiToGen(meta.price)} GEN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time + tx link */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-black/30">{relativeTime(event.occurredAt)}</div>
                    {!event.txHash.startsWith("sync-") && (
                      <a
                        href={`${explorerUrl}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-black/30 hover:text-black font-mono flex items-center gap-0.5 justify-end mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {event.txHash.slice(0, 8)}…
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
