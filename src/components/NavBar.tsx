"use client";
import { motion } from "framer-motion";
import { Zap, Wallet, WifiOff, ChevronDown } from "lucide-react";
import { useState } from "react";
import { shortAddr } from "@/lib/format";
import type { WalletState } from "@/hooks/useWallet";

interface NavBarProps {
  wallet: WalletState;
  activePage: string;
  onNavigate: (page: string) => void;
}

const PAGES = [
  { id: "market", label: "Market" },
  { id: "create", label: "Create" },
  { id: "activity", label: "Activity" },
  { id: "my-nfts", label: "My NFTs" },
];

export default function NavBar({ wallet, activePage, onNavigate }: NavBarProps) {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-black/8 bg-white/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => onNavigate("market")}
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <motion.div
            className="w-7 h-7 bg-black rounded-lg flex items-center justify-center"
            whileHover={{ rotate: 15 }}
          >
            <img src="/logo.png" alt="DriftMarket" className="w-4 h-4 object-contain" />
          </motion.div>
          <span>DriftMarket</span>
        </button>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1">
          {PAGES.map((page) => (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activePage === page.id
                  ? "text-black bg-black/5"
                  : "text-black/50 hover:text-black hover:bg-black/5"
              }`}
            >
              {activePage === page.id && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-black/8 rounded-lg"
                />
              )}
              <span className="relative">{page.label}</span>
            </button>
          ))}
        </div>

        {/* Wallet button */}
        <div className="relative">
          {!wallet.isConnected ? (
            <button
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl hover:bg-black/80 transition-colors disabled:opacity-60"
            >
              {wallet.isConnecting ? (
                <>
                  <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  Connect Wallet
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setWalletMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 border border-black/10 rounded-xl text-sm hover:bg-black/5 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="font-mono text-xs">{shortAddr(wallet.address)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-black/40" />
            </button>
          )}

          {walletMenuOpen && wallet.isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="px-3 py-2 border-b border-black/5">
                <div className="text-xs text-black/40">Connected</div>
                <div className="text-xs font-mono mt-0.5">{wallet.address}</div>
              </div>
              <button
                onClick={() => {
                  wallet.disconnect();
                  setWalletMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-black/5 transition-colors flex items-center gap-2"
              >
                <WifiOff className="w-3.5 h-3.5 text-black/40" />
                Disconnect
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden border-t border-black/5 flex">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activePage === page.id
                ? "text-black border-t-2 border-black -mt-px"
                : "text-black/40"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
