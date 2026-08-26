"use client";
/**
 * ConfirmInline — custom two-step confirm/cancel (no window.confirm).
 * Rule #8: browser confirm dialogs are blocked in sandboxed iframes.
 */
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmInlineProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmInline({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = true,
  loading = false,
}: ConfirmInlineProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ duration: 0.15 }}
        className="border border-black/10 rounded-xl p-4 bg-white shadow-lg mt-2"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
          )}
          <p className="text-sm text-black/80 leading-snug">{message}</p>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-3 py-1.5 text-xs font-medium border border-black/10 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
              danger
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-black text-white hover:bg-black/80"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
