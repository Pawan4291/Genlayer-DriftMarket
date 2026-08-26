"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import ValidatorStrip from "@/components/ValidatorStrip";
import MarketPage from "@/components/MarketPage";
import CreatePage from "@/components/CreatePage";
import ActivityPage from "@/components/ActivityPage";
import MyNFTsPage from "@/components/MyNFTsPage";
import { useWallet } from "@/hooks/useWallet";

export default function App() {
  const [page, setPage] = useState("market");
  const wallet = useWallet();

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Validator status strip at top */}
      <ValidatorStrip />

      {/* Navigation */}
      <NavBar
        wallet={wallet}
        activePage={page}
        onNavigate={setPage}
      />

      {/* Wallet error banner */}
      {wallet.error && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-center text-sm text-red-600">
          {wallet.error}
        </div>
      )}

      {/* Page content */}
      <main>
        <AnimatePresence mode="wait">
          {page === "market" && (
            <motion.div
              key="market"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <MarketPage walletAddress={wallet.address} />
            </motion.div>
          )}

          {page === "create" && (
            <motion.div
              key="create"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <CreatePage
                walletAddress={wallet.address}
                onConnect={wallet.connect}
                onNavigate={setPage}
              />
            </motion.div>
          )}

          {page === "activity" && (
            <motion.div
              key="activity"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <ActivityPage />
            </motion.div>
          )}

          {page === "my-nfts" && (
            <motion.div
              key="my-nfts"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <MyNFTsPage
                walletAddress={wallet.address}
                onConnect={wallet.connect}
                onNavigate={setPage}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-black/30">
            DriftMarket — Prices drift by AI validator consensus on GenLayer
          </div>
          <div className="flex items-center gap-4 text-xs text-black/30 font-mono">
            <a
              href="https://explorer-bradbury.genlayer.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Explorer ↗
            </a>
            <a
              href="https://studio.genlayer.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Studio ↗
            </a>
            <a
              href="https://docs.genlayer.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors"
            >
              Docs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
