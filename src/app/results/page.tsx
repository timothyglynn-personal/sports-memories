"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Memory {
  title: string;
  team: string;
  year: number;
  sport: string;
  blurb: string;
  image_query?: string;
  image_url?: string;
  rank: number;
}

interface Generation {
  id: string;
  city: string;
  decade: string;
  sports: string[];
  model: string;
  results: Memory[];
  createdAt: string;
}

const SPORT_COLORS: Record<string, string> = {
  Rugby: "bg-green-600",
  Soccer: "bg-emerald-600",
  Basketball: "bg-orange-500",
  NFL: "bg-red-700",
  Baseball: "bg-blue-700",
  Hockey: "bg-cyan-600",
  Tennis: "bg-yellow-500",
  Cricket: "bg-lime-600",
  Motorsport: "bg-red-500",
};

const SPORT_FALLBACK_GRADIENT: Record<string, string> = {
  Rugby: "from-green-800 to-green-950",
  Soccer: "from-emerald-800 to-emerald-950",
  Basketball: "from-orange-700 to-orange-950",
  NFL: "from-red-800 to-red-950",
  Baseball: "from-blue-800 to-blue-950",
  Hockey: "from-cyan-800 to-cyan-950",
  Tennis: "from-yellow-700 to-yellow-950",
  Cricket: "from-lime-800 to-lime-950",
  Motorsport: "from-red-700 to-red-950",
};

export default function ResultsPage() {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Set<string>>>({});
  const [reorderInput, setReorderInput] = useState("");
  const [reorderReason, setReorderReason] = useState("");
  const [reorderSubmitted, setReorderSubmitted] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("currentGeneration");
      if (stored) {
        setGeneration(JSON.parse(stored));
      } else {
        router.push("/");
      }
    });
  }, [router]);

  function saveFeedback(type: string, cardIndex?: number, reorder?: string, text?: string) {
    if (!generation) return;
    const fb = {
      id: crypto.randomUUID(),
      generationId: generation.id,
      type,
      cardIndex,
      reorderValue: reorder,
      freeformText: text,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("feedback") || "[]");
    existing.push(fb);
    localStorage.setItem("feedback", JSON.stringify(existing));
  }

  function handleFlag(type: "not_accurate" | "not_good", index: number) {
    const key = `${type}-${index}`;
    setFeedback((prev) => {
      const next = { ...prev };
      if (!next[generation!.id]) next[generation!.id] = new Set();
      next[generation!.id].add(key);
      return next;
    });
    saveFeedback(type, index);
  }

  function isFlagged(type: string, index: number) {
    return feedback[generation?.id || ""]?.has(`${type}-${index}`) || false;
  }

  function handleReorder() {
    const trimmed = reorderInput.trim();
    const parts = trimmed.split(",").map((s) => parseInt(s.trim()));
    if (parts.length === 3 && parts.every((n) => n >= 1 && n <= 3) && new Set(parts).size === 3) {
      saveFeedback("reorder", undefined, trimmed);
      if (reorderReason.trim()) {
        saveFeedback("reorder_reason", undefined, trimmed, reorderReason.trim());
      }
      setReorderSubmitted(true);
    }
  }

  function handleFreeformSubmit() {
    if (!feedbackText.trim()) return;
    saveFeedback("freeform", undefined, undefined, feedbackText);
    setFeedbackSent(true);
    setTimeout(() => { setShowFeedbackModal(false); setFeedbackSent(false); setFeedbackText(""); }, 1500);
  }

  async function handleRegenerate() {
    if (!generation) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: generation.city, decade: generation.decade, sports: generation.sports, model: generation.model }),
      });
      const data = await res.json();
      if (!res.ok || !data.memories) {
        alert(data.error || "Failed to regenerate.");
        setLoading(false);
        return;
      }
      const newGen: Generation = {
        id: crypto.randomUUID(),
        city: generation.city,
        decade: generation.decade,
        sports: generation.sports,
        model: generation.model,
        results: data.memories,
        createdAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("generations") || "[]");
      existing.push(newGen);
      localStorage.setItem("generations", JSON.stringify(existing));
      localStorage.setItem("currentGeneration", JSON.stringify(newGen));
      setGeneration(newGen);
      setReorderInput("");
      setReorderSubmitted(false);
    } catch (err) {
      console.error("Regeneration failed:", err);
      alert("Network error — try again.");
    }
    setLoading(false);
  }

  function getImageUrl(memory: Memory) {
    if (memory.image_url) return memory.image_url;
    // Fallback sport-specific images if Wikipedia returned nothing
    const sportImages: Record<string, string> = {
      Soccer: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=300&fit=crop",
      Basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=300&fit=crop",
      Baseball: "https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=600&h=300&fit=crop",
      NFL: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&h=300&fit=crop",
      Rugby: "https://images.unsplash.com/photo-1544298621-35a764866ff0?w=600&h=300&fit=crop",
      Hockey: "https://images.unsplash.com/photo-1580600301354-0ce8faef576c?w=600&h=300&fit=crop",
      Tennis: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=300&fit=crop",
      Cricket: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=300&fit=crop",
      Motorsport: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=300&fit=crop",
    };
    return sportImages[memory.sport] || "https://images.unsplash.com/photo-1461896836934-bd45ea8b7d5e?w=600&h=300&fit=crop";
  }

  if (!generation) {
    return <main className="flex-1 flex items-center justify-center"><p className="text-gray-400">Loading...</p></main>;
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-6 md:py-8">
      <div className="w-full max-w-2xl">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/query")}
              className="px-3 py-2 rounded-lg bg-navy-light border border-navy-lighter text-gray-300 text-sm hover:border-gold transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{generation.city} — {generation.decade}</h1>
              <p className="text-gray-400 text-xs">Model: {generation.model === "claude" ? "Claude Haiku" : "GPT-4o Mini"}</p>
            </div>
          </div>
          <Link href="/admin" className="px-3 py-2 rounded-lg bg-navy-light border border-navy-lighter text-gray-300 text-sm hover:border-gold transition-colors">
            Admin
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-xl text-gold animate-pulse">Searching the archives...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {generation.results.map((memory, i) => (
                <div key={i} className="animate-slide-in bg-navy-light rounded-xl overflow-hidden border border-navy-lighter">
                  {/* Full image */}
                  <div className={`relative bg-gradient-to-br ${SPORT_FALLBACK_GRADIENT[memory.sport] || "from-gray-800 to-gray-950"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(memory)}
                      alt={memory.title}
                      className="w-full h-auto max-h-[400px] object-contain bg-black/40"
                      onError={(e) => { (e.target as HTMLImageElement).className = "w-full h-48 object-cover opacity-30"; }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-3xl font-black text-gold">{memory.rank}</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">{memory.title}</h3>
                        <p className="text-gray-400 text-sm">{memory.team} • {memory.year}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{memory.blurb}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${SPORT_COLORS[memory.sport] || "bg-gray-600"}`}>
                        {memory.sport}
                      </span>
                      <button
                        onClick={() => handleFlag("not_accurate", i)}
                        disabled={isFlagged("not_accurate", i)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                          isFlagged("not_accurate", i) ? "bg-red-700 text-white cursor-not-allowed" : "bg-navy-lighter text-gray-400 hover:bg-red-900 hover:text-red-200"
                        }`}
                      >
                        Not Accurate
                      </button>
                      <button
                        onClick={() => handleFlag("not_good", i)}
                        disabled={isFlagged("not_good", i)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                          isFlagged("not_good", i) ? "bg-orange-600 text-white cursor-not-allowed" : "bg-navy-lighter text-gray-400 hover:bg-orange-900 hover:text-orange-200"
                        }`}
                      >
                        Not A Good Example
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reorder */}
            <div className="bg-navy-light rounded-xl p-4 md:p-6 border border-navy-lighter mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">How would YOU rank these? (e.g. 2,1,3)</label>
              <div className="flex gap-2">
                <input type="text" value={reorderInput} onChange={(e) => setReorderInput(e.target.value)} placeholder="2,1,3" disabled={reorderSubmitted}
                  className="flex-1 px-4 py-2 rounded-lg bg-navy border border-navy-lighter text-white placeholder-gray-500 focus:outline-none focus:border-gold" />
                <button onClick={handleReorder} disabled={reorderSubmitted}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${reorderSubmitted ? "bg-green-700 text-white cursor-not-allowed" : "bg-blue text-white hover:bg-blue/80"}`}>
                  {reorderSubmitted ? "Saved!" : "Submit"}
                </button>
              </div>
              <textarea
                value={reorderReason}
                onChange={(e) => setReorderReason(e.target.value)}
                placeholder="Why would you rank them differently? (e.g. 'The 2009 World Series was bigger for NYC than the 2000 one because...')"
                rows={2}
                disabled={reorderSubmitted}
                className="w-full mt-3 px-4 py-2 rounded-lg bg-navy border border-navy-lighter text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold resize-none disabled:opacity-50"
              />
              {reorderSubmitted && <p className="text-xs text-green-400 mt-2">Your ranking feedback has been saved and will help improve future results.</p>}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleRegenerate} className="px-5 py-3 rounded-lg bg-gold text-navy font-bold hover:bg-gold/90 transition-all cursor-pointer">
                Give Me Another
              </button>
              <button onClick={() => router.push("/query")} className="px-5 py-3 rounded-lg bg-navy-lighter border border-navy-lighter text-gray-300 font-semibold hover:border-gold transition-all cursor-pointer">
                Change Inputs
              </button>
              <button onClick={() => setShowFeedbackModal(true)} className="px-5 py-3 rounded-lg bg-navy-lighter border border-navy-lighter text-gray-300 font-semibold hover:border-gold transition-all cursor-pointer">
                Give Feedback
              </button>
            </div>
          </>
        )}
      </div>

      {/* Feedback modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-light rounded-xl p-6 w-full max-w-md border border-navy-lighter">
            {feedbackSent ? (
              <p className="text-center text-xl text-gold font-bold">Thank you!</p>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Your Feedback</h2>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Tell us what you think..." rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-navy border border-navy-lighter text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none mb-4" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
                  <button onClick={handleFreeformSubmit} className="px-4 py-2 rounded-lg bg-gold text-navy font-semibold hover:bg-gold/90 transition-all cursor-pointer">Submit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
