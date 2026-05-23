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

export default function QueryPage() {
  const [sports, setSports] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [decade, setDecade] = useState(DECADES[3]);
  const [model, setModel] = useState<"claude" | "gpt4">("claude");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("selectedSports");
    if (stored) {
      setSports(JSON.parse(stored));
    } else {
      router.push("/");
    }
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
        results: data.memories,
        createdAt: new Date().toISOString(),
      };

      const existing = JSON.parse(
        localStorage.getItem("generations") || "[]"
      );
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

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <button
        onClick={() => router.push("/")}
        className="mb-6 px-4 py-2 rounded-lg bg-navy-light border border-navy-lighter text-gray-300 text-sm hover:border-gold transition-colors"
      >
        ← Change Sports
      </button>
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
        Ranking Your City&apos;s Greatest{" "}
        <span className="text-gold">Sporting Memories</span>
      </h1>
      <p className="text-gray-400 mb-8 text-center">
        Sports: {sports.join(", ")}
      </p>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Melbourne, Chicago, Manchester..."
            className="w-full px-4 py-3 rounded-lg bg-navy-light border border-navy-lighter
                       text-lg text-white placeholder-gray-500 focus:outline-none
                       focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Decade
          </label>
          <select
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-navy-light border border-navy-lighter
                       text-lg text-white focus:outline-none focus:border-gold transition-colors"
          >
            {DECADES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Model
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setModel("claude")}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all cursor-pointer
                ${
                  model === "claude"
                    ? "bg-blue text-white"
                    : "bg-navy-light text-gray-400 border border-navy-lighter"
                }`}
            >
              Claude
            </button>
            <button
              onClick={() => setModel("gpt4")}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all cursor-pointer
                ${
                  model === "gpt4"
                    ? "bg-blue text-white"
                    : "bg-navy-light text-gray-400 border border-navy-lighter"
                }`}
            >
              GPT-4
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!city.trim() || loading}
          className={`
            w-full py-4 rounded-lg font-bold text-lg transition-all duration-200
            ${
              city.trim() && !loading
                ? "bg-gold text-navy hover:bg-gold/90 cursor-pointer"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {loading ? "Searching the archives..." : "Generate Memories"}
        </button>
      </div>
    </main>
  );
}
