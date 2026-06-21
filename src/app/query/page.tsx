"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DECADES = [
  "1970-1980",
  "1980-1990",
  "1990-2000",
  "2000-2010",
  "2010-2020",
  "2020-Present",
];

const MODELS = [
  {
    id: "haiku",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    badge: "Fast",
    description: "Fastest response. Good for quick iterations and testing. May sacrifice depth for speed.",
    tradeoffs: "Speed: Excellent | Accuracy: Good | Cost: Low",
  },
  {
    id: "sonnet",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    badge: "Balanced",
    description: "Best balance of speed and quality. Strong at structured reasoning and factual recall.",
    tradeoffs: "Speed: Good | Accuracy: Very Good | Cost: Medium",
  },
  {
    id: "opus",
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    badge: "Premium",
    description: "Most capable Anthropic model. Best for nuanced cultural context and ranking quality. Slower.",
    tradeoffs: "Speed: Slow | Accuracy: Excellent | Cost: High",
  },
  {
    id: "gpt4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    badge: "Fast",
    description: "OpenAI's fast model. Good general knowledge but may be less precise on niche sports.",
    tradeoffs: "Speed: Excellent | Accuracy: Good | Cost: Low",
  },
  {
    id: "gpt4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: "Balanced",
    description: "OpenAI's flagship. Strong on well-known events, sometimes invents details on obscure ones.",
    tradeoffs: "Speed: Good | Accuracy: Very Good | Cost: Medium",
  },
];

export default function QueryPage() {
  const [sports, setSports] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [decade, setDecade] = useState(DECADES[3]);
  const [model, setModel] = useState("haiku");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("selectedSports");
      if (stored) {
        setSports(JSON.parse(stored));
      } else {
        router.push("/");
      }
    });
  }, [router]);

  async function handleGenerate() {
    if (!city.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, decade, sports, model }),
      });

      const data = await res.json();

      if (!res.ok || !data.memories) {
        alert(data.error || "Failed to generate memories. Try again.");
        setLoading(false);
        return;
      }

      const generation = {
        id: crypto.randomUUID(),
        city,
        decade,
        sports,
        model,
        modelId: data.meta?.model || model,
        provider: data.meta?.provider || "unknown",
        latencyMs: data.meta?.latencyMs || 0,
        results: data.memories,
        createdAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem("generations") || "[]");
      existing.push(generation);
      localStorage.setItem("generations", JSON.stringify(existing));
      localStorage.setItem("currentGeneration", JSON.stringify(generation));

      router.push("/results");
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  const selectedModel = MODELS.find((m) => m.id === model)!;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 md:py-12">
      <button
        onClick={() => router.push("/")}
        className="mb-6 px-4 py-2 rounded-lg bg-navy-light border border-navy-lighter text-gray-300 text-sm hover:border-gold transition-colors"
      >
        ← Change Sports
      </button>
      <h1 className="text-2xl md:text-4xl font-bold text-center mb-2">
        Ranking Your City&apos;s Greatest{" "}
        <span className="text-gold">Sporting Memories</span>
      </h1>
      <p className="text-gray-400 mb-8 text-center">
        Sports: {sports.join(", ")}
      </p>

      <div className="w-full max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Your City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Melbourne, Chicago, Manchester..."
            className="w-full px-4 py-3 rounded-lg bg-navy-light border border-navy-lighter text-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Decade</label>
          <select
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-navy-light border border-navy-lighter text-lg text-white focus:outline-none focus:border-gold transition-colors"
          >
            {DECADES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Model selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">AI Model</label>

          {/* Provider sections */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Anthropic</p>
            <div className="grid grid-cols-3 gap-2">
              {MODELS.filter((m) => m.provider === "Anthropic").map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    model === m.id
                      ? "bg-blue border-blue text-white"
                      : "bg-navy-light text-gray-400 border-navy-lighter hover:border-gray-500"
                  }`}
                >
                  <div>{m.name.split(" ").slice(-2).join(" ")}</div>
                  <div className={`text-[10px] mt-0.5 ${model === m.id ? "text-blue-200" : "text-gray-500"}`}>{m.badge}</div>
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-wide pt-2">OpenAI</p>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.filter((m) => m.provider === "OpenAI").map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    model === m.id
                      ? "bg-blue border-blue text-white"
                      : "bg-navy-light text-gray-400 border-navy-lighter hover:border-gray-500"
                  }`}
                >
                  <div>{m.name}</div>
                  <div className={`text-[10px] mt-0.5 ${model === m.id ? "text-blue-200" : "text-gray-500"}`}>{m.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model info card */}
          <div className="mt-3 bg-navy rounded-lg p-3 border border-navy-lighter/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">{selectedModel.name}</span>
              <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">{selectedModel.provider}</span>
            </div>
            <p className="text-xs text-gray-400 mb-1">{selectedModel.description}</p>
            <p className="text-[10px] text-gray-500 font-mono">{selectedModel.tradeoffs}</p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!city.trim() || loading}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
            city.trim() && !loading
              ? "bg-gold text-navy hover:bg-gold/90 cursor-pointer"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Searching the archives..." : "Generate Memories"}
        </button>
      </div>
    </main>
  );
}
