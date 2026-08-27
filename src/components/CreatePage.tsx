"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle, ExternalLink, ArrowLeft, Info } from "lucide-react";
import { useGenLayer } from "@/hooks/useGenLayer";
import { genToWei, weiToGen } from "@/lib/format";

const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer-bradbury.genlayer.com";

interface CreatePageProps {
  walletAddress: string | null;
  onConnect: () => Promise<void>;
  onNavigate: (page: string) => void;
}

interface FormData {
  title: string;
  description: string;
  floorPriceGEN: string;
  supply: string;
  imageUrl: string;
}

type FormErrors = Partial<FormData>;

export default function CreatePage({ walletAddress, onConnect, onNavigate }: CreatePageProps) {
  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    floorPriceGEN: "",
    supply: "1",
    imageUrl: "",
  });
  const [step, setStep] = useState<"form" | "pending" | "success">("form");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const { createListing, isPending, error: txError } = useGenLayer(walletAddress);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Title is required";
    else if (form.title.length > 100) errs.title = "Max 100 characters";
    if (!form.imageUrl.trim()) errs.imageUrl = "Image is required";
    if (!form.description.trim()) errs.description = "Description is required";
    else if (form.description.length > 500) errs.description = "Max 500 characters";
    if (!form.floorPriceGEN || parseFloat(form.floorPriceGEN) <= 0)
      errs.floorPriceGEN = "Floor price must be > 0 GEN";
    const supply = parseInt(form.supply, 10);
    if (isNaN(supply) || supply <= 0) errs.supply = "Supply must be ≥ 1";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !walletAddress) return;

    setStep("pending");
    try {
      const floorPriceWei = genToWei(form.floorPriceGEN).toString();
      const hash = await createListing({
        title: form.title,
        description: form.description,
        floorPriceWei,
        supply: parseInt(form.supply, 10),
        feeWei: "0",
      });
      setTxHash(hash);
      setStep("success");
    } catch {
      setStep("form");
    }
  };

  if (!walletAddress) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-black/50 mb-8 text-sm leading-relaxed">
            You need a MetaMask wallet connected to GenLayer testnet-bradbury
            to create listings. Your NFT will be priced by real AI validators.
          </p>
          <button
            onClick={onConnect}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-black/80 transition-colors"
          >
            Connect MetaMask
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => onNavigate("market")}
        className="flex items-center gap-2 text-sm text-black/40 hover:text-black mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to market
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-1">Create Listing</h1>
        <p className="text-sm text-black/50 mb-8 leading-relaxed">
          Your NFT will be priced by GenLayer AI validators on-chain.
          The description you write is the exact prompt fed to the LLM jury.
        </p>

        {/* AI info banner */}
        <div className="flex items-start gap-3 p-4 bg-black/[0.03] rounded-xl border border-black/5 mb-6">
          <Info className="w-4 h-4 text-black/40 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-black/50 leading-relaxed">
            Write a descriptive title and description — validators will use them
            to judge market demand and set the drift percentage each cycle.
            Strong demand signals push prices up; weak signals push prices down.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5 block">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Cosmic Genesis #001"
                  maxLength={100}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-colors ${
                    errors.title ? "border-red-300 bg-red-50/30" : "border-black/10 focus:border-black/30"
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                  <p className="text-xs text-black/25 ml-auto">{form.title.length}/100</p>
                </div>
              </div>

             {/* Image Upload */}
<div>
  <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5 block">
    Image <span className="text-red-400">*</span>
  </label>
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5MB");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setForm({ ...form, imageUrl: data.url });
    }}
    className="w-full px-4 py-3 border border-black/10 rounded-xl text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-black file:text-white file:text-xs"
  />
  {form.imageUrl && (
    <img src={form.imageUrl} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-lg" />
  )}
  {errors.imageUrl && <p className="text-xs text-red-500 mt-1">{errors.imageUrl}</p>}
</div>
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5 block">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your NFT in detail. This text becomes the AI validator prompt — be specific about rarity, utility, and why buyers should want it."
                  rows={5}
                  maxLength={500}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-colors resize-none ${
                    errors.description ? "border-red-300 bg-red-50/30" : "border-black/10 focus:border-black/30"
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                  <p className="text-xs text-black/25 ml-auto">{form.description.length}/500</p>
                </div>
              </div>

              {/* Price + Supply */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5 block">
                    Floor Price (GEN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={form.floorPriceGEN}
                    onChange={(e) => setForm({ ...form, floorPriceGEN: e.target.value })}
                    placeholder="0.01"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-colors ${
                      errors.floorPriceGEN ? "border-red-300 bg-red-50/30" : "border-black/10 focus:border-black/30"
                    }`}
                  />
                  {errors.floorPriceGEN && (
                    <p className="text-xs text-red-500 mt-1">{errors.floorPriceGEN}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5 block">
                    Supply <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={form.supply}
                    onChange={(e) => setForm({ ...form, supply: e.target.value })}
                    placeholder="1"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-colors ${
                      errors.supply ? "border-red-300 bg-red-50/30" : "border-black/10 focus:border-black/30"
                    }`}
                  />
                  {errors.supply && <p className="text-xs text-red-500 mt-1">{errors.supply}</p>}
                </div>
              </div>

              {/* Live preview */}
              <AnimatePresence>
                {form.floorPriceGEN && parseFloat(form.floorPriceGEN) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-black/[0.03] rounded-xl border border-black/5">
                      <div className="text-xs text-black/30 mb-3 font-mono uppercase tracking-wider">
                        Listing Preview
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm">
                            {form.title || <span className="text-black/30">Untitled</span>}
                          </div>
                          <div className="text-xs text-black/40 mt-0.5">Supply: {form.supply}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{form.floorPriceGEN}</div>
                          <div className="text-xs text-black/40">GEN (floor)</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {txError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                >
                  {txError}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                    Awaiting validator consensus…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Listing on Chain
                  </>
                )}
              </button>

              <p className="text-xs text-center text-black/25 leading-relaxed">
                Submits a real transaction to GenLayer testnet-bradbury.
                Consensus can take 10–60 seconds.
              </p>
            </motion.form>
          )}

          {step === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-black/10 rounded-full" />
                <div className="absolute inset-0 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-3 border-2 border-black/10 rounded-full" />
                <div
                  className="absolute inset-3 border-2 border-black/30 border-t-transparent rounded-full animate-spin"
                  style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
                />
              </div>
              <h3 className="text-lg font-bold mb-2">Validators Voting…</h3>
              <p className="text-sm text-black/50 max-w-xs mx-auto leading-relaxed">
                GenLayer validators are running LLM inference and reaching consensus via
                Optimistic Democracy. This takes 10–60 seconds on testnet.
              </p>
              <div className="mt-6 flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-black rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, delay: i * 0.15, duration: 1 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">Listing Created!</h3>
              <p className="text-sm text-black/50 mb-6 leading-relaxed">
                Your NFT is live on testnet-bradbury.
                AI validators will drift the price on each cycle call.
              </p>

              {txHash && (
                <a
                  href={`${EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-black/10 rounded-xl text-sm hover:bg-black/5 transition-colors mb-5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Transaction on Explorer
                </a>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep("form");
                    setForm({ title: "", description: "", floorPriceGEN: "", supply: "1", imageUrl: "" });
                    setTxHash(null);
                    setErrors({});
                  }}
                  className="flex-1 py-2.5 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors"
                >
                  Create Another
                </button>
                <button
                  onClick={() => onNavigate("market")}
                  className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors"
                >
                  View Market
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
