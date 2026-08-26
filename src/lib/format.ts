/**
 * Formatting utilities for DriftMarket.
 * All values come from chain reads — never invent numbers here.
 */

const WEI_PER_GEN = BigInt("1000000000000000000"); // 1e18

/** Convert wei string to human-readable GEN amount */
export function weiToGen(weiStr: string | null | undefined): string {
  if (!weiStr || weiStr === "0") return "0";
  try {
    const wei = BigInt(weiStr);
    const gen = Number(wei) / Number(WEI_PER_GEN);
    if (gen < 0.001) return `<0.001`;
    if (gen < 1) return gen.toFixed(4);
    if (gen < 1000) return gen.toFixed(3);
    return gen.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } catch {
    return "?";
  }
}

/** Convert GEN to wei BigInt */
export function genToWei(gen: string): bigint {
  try {
    const f = parseFloat(gen);
    if (isNaN(f) || f < 0) return BigInt(0);
    // Multiply by 1e18 without floating point errors
    const [int, dec = ""] = gen.split(".");
    const padded = (dec + "000000000000000000").slice(0, 18);
    return BigInt(int) * WEI_PER_GEN + BigInt(padded);
  } catch {
    return BigInt(0);
  }
}

/** Short address: 0x1234...abcd */
export function shortAddr(addr: string | null | undefined): string {
  if (!addr || addr.length < 10) return addr ?? "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Format a timestamp as relative time */
export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Format percent change with sign */
export function fmtPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Compute sold percentage */
export function soldPct(sold: string, supply: string): number {
  const s = Number(sold);
  const t = Number(supply);
  if (t === 0) return 0;
  return Math.min(100, Math.round((s / t) * 100));
}
