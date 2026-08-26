"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shortAddr } from "@/lib/format";

interface Validator {
  address?: string;
  stake?: string;
}

export default function ValidatorStrip() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/validators");
        const data = await res.json();
        if (mounted) {
          setValidators(data.validators ?? []);
          setError(data.error ?? null);
        }
      } catch {
        if (mounted) setError("Could not reach validators");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full border-b border-black/10 bg-black text-white overflow-hidden">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-r border-white/20 bg-black z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase text-white/70">
            Live Validators
          </span>
        </div>

        {/* Scrolling strip */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="px-4 py-2 text-xs font-mono text-white/40">
              Connecting to GenLayer testnet-bradbury…
            </div>
          ) : error ? (
            <div className="px-4 py-2 text-xs font-mono text-white/40">
              {error}
            </div>
          ) : validators.length === 0 ? (
            <div className="px-4 py-2 text-xs font-mono text-white/40">
              No active validators found
            </div>
          ) : (
            <div className="marquee flex gap-8 py-2 px-4">
              {[...validators, ...validators].map((v, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-2">
                  <span className="text-xs font-mono text-white/60">
                    {shortAddr(v.address ?? "")}
                  </span>
                  {v.stake && (
                    <span className="text-xs text-white/30">
                      {v.stake}
                    </span>
                  )}
                  <span className="text-white/20">·</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Network badge */}
        <div className="flex-shrink-0 px-4 py-2 border-l border-white/20">
          <a
            href="https://explorer-bradbury.genlayer.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-white/40 hover:text-white/80 transition-colors"
          >
            testnet-bradbury ↗
          </a>
        </div>
      </div>
    </div>
  );
}
