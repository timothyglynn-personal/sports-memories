"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Generation {
  id: string;
  city: string;
  decade: string;
  sports: string[];
  model: string;
  results: { title: string; team: string; year: number; sport: string }[];
  createdAt: string;
}

interface Feedback {
  id: string;
  generationId: string;
  type: string;
  cardIndex?: number;
  reorderValue?: string;
  freeformText?: string;
  createdAt: string;
}

export default function AdminPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);

  useEffect(() => {
    setGenerations(
      JSON.parse(localStorage.getItem("generations") || "[]")
    );
    setFeedbackItems(
      JSON.parse(localStorage.getItem("feedback") || "[]")
    );
  }, []);

  const totalGenerations = generations.length;
  const totalCards = totalGenerations * 3;

  const notAccurateCount = feedbackItems.filter(
    (f) => f.type === "not_accurate"
  ).length;
  const notGoodCount = feedbackItems.filter(
    (f) => f.type === "not_good"
  ).length;
  const reorders = feedbackItems.filter((f) => f.type === "reorder");

  const accuracyRate =
    totalCards > 0
      ? (((totalCards - notAccurateCount) / totalCards) * 100).toFixed(1)
      : "N/A";
  const qualityRate =
    totalCards > 0
      ? (((totalCards - notGoodCount) / totalCards) * 100).toFixed(1)
      : "N/A";

  function avgReorderDistance(): string {
    if (reorders.length === 0) return "N/A";
    let totalDist = 0;
    for (const r of reorders) {
      if (!r.reorderValue) continue;
      const parts = r.reorderValue.split(",").map((s) => parseInt(s.trim()));
      let dist = 0;
      for (let i = 0; i < 3; i++) {
        dist += Math.abs(parts[i] - (i + 1));
      }
      totalDist += dist;
    }
    return (totalDist / reorders.length).toFixed(2);
  }

  // Find most-flagged events
  const flaggedEvents: Record<string, number> = {};
  for (const fb of feedbackItems) {
    if (fb.type === "not_accurate" || fb.type === "not_good") {
      const gen = generations.find((g) => g.id === fb.generationId);
      if (gen && fb.cardIndex !== undefined && gen.results[fb.cardIndex]) {
        const title = gen.results[fb.cardIndex].title;
        flaggedEvents[title] = (flaggedEvents[title] || 0) + 1;
      }
    }
  }
  const sortedFlagged = Object.entries(flaggedEvents)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Eval Performance <span className="text-gold">Dashboard</span>
          </h1>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-navy-light border border-navy-lighter
                       text-gray-300 text-sm hover:border-gold transition-colors"
          >
            Back to App
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Generations" value={totalGenerations.toString()} />
          <StatCard label="Accuracy Rate" value={`${accuracyRate}%`} />
          <StatCard label="Quality Rate" value={`${qualityRate}%`} />
          <StatCard label="Avg Reorder Distance" value={avgReorderDistance()} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-navy-light rounded-xl p-6 border border-navy-lighter">
            <h2 className="text-lg font-bold mb-4">Recent Generations</h2>
            {generations.length === 0 ? (
              <p className="text-gray-500">No generations yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {generations
                  .slice(-10)
                  .reverse()
                  .map((gen) => {
                    const genFb = feedbackItems.filter(
                      (f) => f.generationId === gen.id
                    );
                    return (
                      <div
                        key={gen.id}
                        className="p-3 bg-navy rounded-lg border border-navy-lighter"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">
                              {gen.city} ({gen.decade})
                            </p>
                            <p className="text-xs text-gray-500">
                              {gen.model} &bull;{" "}
                              {new Date(gen.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {genFb.length} feedback
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-navy-light rounded-xl p-6 border border-navy-lighter">
            <h2 className="text-lg font-bold mb-4">Most Flagged Events</h2>
            {sortedFlagged.length === 0 ? (
              <p className="text-gray-500">No flags yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedFlagged.map(([title, count]) => (
                  <div
                    key={title}
                    className="flex justify-between items-center p-2 bg-navy rounded-lg"
                  >
                    <span className="text-sm truncate mr-2">{title}</span>
                    <span className="text-xs font-bold text-red-400 shrink-0">
                      {count} flags
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-light rounded-xl p-4 border border-navy-lighter text-center">
      <p className="text-2xl font-bold text-gold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
