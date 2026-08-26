"use client";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { weiToGen } from "@/lib/format";

interface PricePoint {
  id: number;
  cycleNumber: number;
  priceBeforeWei: string;
  priceAfterWei: string;
  adjustmentPercent: number | null;
  reasoning: string | null;
  recordedAt: string | Date;
}

interface PriceHistoryChartProps {
  history: PricePoint[];
  currentPrice: string;
  floorPrice: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-black text-white px-3 py-2 rounded-lg text-xs font-mono shadow-xl border border-white/10">
      <div className="text-white/60 mb-1">Cycle #{d.cycle}</div>
      <div className="font-bold">{d.price} GEN</div>
      {d.pct !== null && (
        <div className={d.pct >= 0 ? "text-green-400" : "text-red-400"}>
          {d.pct >= 0 ? "+" : ""}{d.pct}%
        </div>
      )}
      {d.reasoning && (
        <div className="text-white/40 max-w-[180px] mt-1 leading-tight">
          {d.reasoning}
        </div>
      )}
    </div>
  );
}

export default function PriceHistoryChart({
  history,
  currentPrice,
  floorPrice,
}: PriceHistoryChartProps) {
  const chartData = useMemo(() => {
    if (history.length === 0) {
      // Show just the current price as baseline
      return [
        {
          cycle: 0,
          price: parseFloat(weiToGen(currentPrice)) || 0,
          pct: null,
          reasoning: "Initial price",
        },
      ];
    }
    const points = history.map((h) => ({
      cycle: h.cycleNumber,
      price: parseFloat(weiToGen(h.priceAfterWei)) || 0,
      pct: h.adjustmentPercent,
      reasoning: h.reasoning,
    }));
    // Prepend cycle 0 (before first adjustment)
    const first = history[0];
    return [
      {
        cycle: 0,
        price: parseFloat(weiToGen(first.priceBeforeWei)) || 0,
        pct: null,
        reasoning: "Floor price",
      },
      ...points,
    ];
  }, [history, currentPrice]);

  const floorPriceGEN = parseFloat(weiToGen(floorPrice)) || 0;
  const minPrice = Math.min(...chartData.map((d) => d.price), floorPriceGEN) * 0.9;
  const maxPrice = Math.max(...chartData.map((d) => d.price)) * 1.1;

  if (chartData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-black/40">
        No price history yet
      </div>
    );
  }

  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000008" />
          <XAxis
            dataKey="cycle"
            tick={{ fontSize: 10, fill: "#00000060", fontFamily: "monospace" }}
            tickFormatter={(v) => `#${v}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10, fill: "#00000060", fontFamily: "monospace" }}
            tickFormatter={(v) => `${v.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          {floorPriceGEN > 0 && (
            <ReferenceLine
              y={floorPriceGEN}
              stroke="#00000020"
              strokeDasharray="4 2"
              label={{
                value: "floor",
                position: "insideTopLeft",
                fill: "#00000040",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#000000"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color =
                payload.pct === null
                  ? "#00000040"
                  : payload.pct > 0
                  ? "#16a34a"
                  : payload.pct < 0
                  ? "#dc2626"
                  : "#000";
              return (
                <circle
                  key={`dot-${payload.cycle}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={color}
                  stroke="white"
                  strokeWidth={1}
                />
              );
            }}
            activeDot={{ r: 5, fill: "#000", stroke: "white", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
