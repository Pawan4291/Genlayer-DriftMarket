"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Zap, ShoppingCart, Users, Clock, ExternalLink } from "lucide-react";
import { weiToGen, soldPct, shortAddr } from "@/lib/format";
import ConfirmInline from "./ConfirmInline";
import PriceHistoryChart from "./PriceHistoryChart";

export interface ListingData {
  id: number;
  seller: string;
  title: string;
  description: string;
  floorPrice: string;
  currentPrice: string;
  supply: string;
  sold: string;
  cyclesRun: string;
  active: boolean;
  lastSyncedAt: string;
  createdAt: string;
}

interface PricePoint {
  id: number;
  cycleNumber: number;
  priceBeforeWei: string;
  priceAfterWei: string;
  adjustmentPercent: number | null;
  reasoning: string | null;
  recordedAt: string;
}

interface ListingCardProps {
  listing: ListingData;
  walletAddress: string | null;
  onBuy: (listingId: number, priceWei: string) => Promise<void>;
  onDelist: (listingId: number) => Promise<void>;
  onAgentCycle?: (listingId: number) => Promise<void>;
  priceHistory?: PricePoint[];
  isBuying?: boolean;
  isDelisting?: boolean;
}

export default function ListingCard({
  listing,
  walletAddress,
  onBuy,
  onDelist,
  onAgentCycle,
  priceHistory = [],
  isBuying = false,
  isDelisting = false,
}: ListingCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [showDelistConfirm, setShowDelistConfirm] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);

  const isSeller =
    walletAddress &&
    listing.seller.toLowerCase() === walletAddress.toLowerCase();

  const pct = soldPct(listing.sold, listing.supply);
  const currentGen = weiToGen(listing.currentPrice);
  const floorGen = weiToGen(listing.floorPrice);
  const currentPriceNum = parseFloat(currentGen) || 0;
  const floorPriceNum = parseFloat(floorGen) || 0;
  const aboveFloor = currentPriceNum > floorPriceNum;
  const belowFloor = currentPriceNum < floorPriceNum;
  const lastCycle = priceHistory[priceHistory.length - 1];
  const lastAdj = lastCycle?.adjustmentPercent;

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer-bradbury.genlayer.com";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative border rounded-2xl overflow-hidden bg-white group transition-shadow hover:shadow-xl ${
        listing.active ? "border-black/10" : "border-black/5 opacity-60"
      }`}
    >
      {/* Status badge */}
      {!listing.active && (
        <div className="absolute top-3 right-3 z-10 px-2 py-0.5 bg-black/5 text-black/40 text-xs font-mono rounded-full border border-black/10">
          Inactive
        </div>
      )}

      {/* AI Badge */}
      {listing.cyclesRun !== "0" && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 bg-black text-white text-xs font-mono rounded-full">
          <Zap className="w-3 h-3" />
          <span>{listing.cyclesRun} cycles</span>
        </div>
      )}

      {/* Header: price trend indicator */}
      <div className={`h-1 w-full ${
        aboveFloor ? "bg-gradient-to-r from-green-400 to-emerald-500" :
        belowFloor ? "bg-gradient-to-r from-red-400 to-rose-500" :
        "bg-black/10"
      }`} />

      <div className="p-5">
        {/* Title & ID */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-base leading-tight">{listing.title}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-black/40 font-mono">#{listing.id}</span>
              <span className="text-black/20">·</span>
              <a
                href={`${explorerUrl}/address/${listing.seller}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black/40 font-mono hover:text-black flex items-center gap-0.5"
              >
                {shortAddr(listing.seller)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Drift indicator */}
          {lastAdj !== null && lastAdj !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono ${
              lastAdj > 0 ? "bg-green-50 text-green-700" :
              lastAdj < 0 ? "bg-red-50 text-red-700" :
              "bg-black/5 text-black/50"
            }`}>
              {lastAdj > 0 ? <TrendingUp className="w-3 h-3" /> : lastAdj < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {lastAdj > 0 ? "+" : ""}{lastAdj}%
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-black/60 leading-relaxed mb-4 line-clamp-2">
          {listing.description}
        </p>

        {/* Price block */}
        <div className="bg-black/[0.03] rounded-xl p-3 mb-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-black/40 font-mono mb-0.5">Current Price</div>
              <div className="text-2xl font-bold tracking-tight">
                {currentGen} <span className="text-sm font-normal text-black/40">GEN</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-black/40 font-mono mb-0.5">Floor</div>
              <div className="text-sm text-black/60 font-mono">{floorGen} GEN</div>
            </div>
          </div>

          {/* Supply bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-black/40 font-mono mb-1">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{listing.sold}/{listing.supply} sold</span>
              </div>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-black rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Chart toggle */}
        {priceHistory.length > 0 && (
          <button
            onClick={() => setShowChart((v) => !v)}
            className="w-full text-xs text-black/40 hover:text-black flex items-center justify-center gap-1 py-1 mb-3 transition-colors"
          >
            {showChart ? "Hide" : "Show"} price chart
            <span className="ml-1">{showChart ? "↑" : "↓"}</span>
          </button>
        )}

        <AnimatePresence>
          {showChart && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <PriceHistoryChart
                history={priceHistory}
                currentPrice={listing.currentPrice}
                floorPrice={listing.floorPrice}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {listing.active && (
          <div className="flex gap-2">
            {!isSeller ? (
              <>
                {!showBuyConfirm ? (
                  <button
                    onClick={() => walletAddress ? setShowBuyConfirm(true) : undefined}
                    disabled={isBuying || !walletAddress}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isBuying ? (
                      <>
                        <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                        Buying…
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {walletAddress ? "Buy Now" : "Connect Wallet"}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1">
                    <ConfirmInline
                      message={`Buy for ${currentGen} GEN? This is a real transaction on testnet-bradbury.`}
                      confirmLabel={`Pay ${currentGen} GEN`}
                      onConfirm={async () => {
                        await onBuy(listing.id, listing.currentPrice);
                        setShowBuyConfirm(false);
                      }}
                      onCancel={() => setShowBuyConfirm(false)}
                      danger={false}
                      loading={isBuying}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {!showDelistConfirm ? (
                  <button
                    onClick={() => setShowDelistConfirm(true)}
                    disabled={isDelisting}
                    className="flex-1 py-2.5 border border-black/20 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors disabled:opacity-40"
                  >
                    {isDelisting ? "Delisting…" : "Delist"}
                  </button>
                ) : (
                  <div className="flex-1">
                    <ConfirmInline
                      message="Delist this NFT? This submits a real transaction and cannot be undone."
                      confirmLabel="Delist"
                      onConfirm={async () => {
                        await onDelist(listing.id);
                        setShowDelistConfirm(false);
                      }}
                      onCancel={() => setShowDelistConfirm(false)}
                      danger={true}
                      loading={isDelisting}
                    />
                  </div>
                )}

                {onAgentCycle && (
                  <button
                    onClick={() => onAgentCycle(listing.id)}
                    className="px-3 py-2.5 border border-black/10 rounded-xl text-xs hover:bg-black/5 transition-colors flex items-center gap-1"
                    title="Trigger AI price cycle"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Drift
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
