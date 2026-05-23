"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Memory {
  title: string;
  team: string;
  year: number;
  sport: string;
  blurb: string;
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

interface Feedback {
  id: string;
  generationId: string;
  type: "not_accurate" | "not_good" | "reorder" | "freeform";
  cardIndex?: number;
  reorderValue?: string;
  freeformText?: string;
  createdAt: string;
}

export default function AdminPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setGenerations(JSON.parse(localStorage.getItem("generations") || "[]"));
    setFeedbackList(JSON.parse(localStorage.getItem("feedback") || "[]"));
    setMounted(true);
  }, []);

  if (!mounted) return <main className="flex-1 flex items-center justify-center"><p className="text-gray-400">Loading...</p></main>;

  const totalCards = generations.length * 3;
  const notAccurate = feedbackList.filter((f) => f.type === "not_accurate").length;
  const notGood = feedbackList.filter((f) => f.type === "not_good").length;
  const reorders = feedbackList.filter((f) => f.type === "reorder");
  const freeformFeedback = feedbackList.filter((f) => f.type === "freeform");

  const accuracyRate = totalCards > 0 ? ((totalCards - notAccurate) / totalCards * 100).toFixed(1) : "—";
  const qualityRate = totalCards > 0 ? ((totalCards - notGood) / totalCards * 100).toFixed(1) : "—";

  const avgReorderDistance = reorders.length > 0
    ? (reorders.reduce((sum, r) => {
        const parts = r.reorderValue?.split(",").map((s) => parseInt(s.trim())) || [1, 2, 3];
        const distance = parts.reduce((d, val, idx) => d + Math.abs(val - (idx + 1)), 0);
        return sum + distance;
      }, 0) / reorders.length).toFixed(2)
    : "—";

  // Rank position analysis
  const rankAcceptance = [0, 0, 0];
  const totalReorders = reorders.length;
  for (const r of reorders) {
    const parts = r.reorderValue?.split(",").map((s) => parseInt(s.trim())) || [];
    if (parts.length === 3) {
      parts.forEach((val, idx) => { if (val === idx + 1) rankAcceptance[idx]++; });
    }
  }

  // City breakdown
  const cityStats: Record<string, { total: number; accurate: number; good: number; reorders: number; reorderDist: number }> = {};
  for (const gen of generations) {
    if (!cityStats[gen.city]) cityStats[gen.city] = { total: 0, accurate: 0, good: 0, reorders: 0, reorderDist: 0 };
    cityStats[gen.city].total++;
    const genFb = feedbackList.filter((f) => f.generationId === gen.id);
    const genInaccurate = genFb.filter((f) => f.type === "not_accurate").length;
    const genBad = genFb.filter((f) => f.type === "not_good").length;
    cityStats[gen.city].accurate += (3 - genInaccurate);
    cityStats[gen.city].good += (3 - genBad);
    const genReorder = genFb.find((f) => f.type === "reorder");
    if (genReorder) {
      cityStats[gen.city].reorders++;
      const parts = genReorder.reorderValue?.split(",").map((s) => parseInt(s.trim())) || [1, 2, 3];
      cityStats[gen.city].reorderDist += parts.reduce((d, val, idx) => d + Math.abs(val - (idx + 1)), 0);
    }
  }

  // Most flagged events
  const eventFlags: Record<string, { title: string; count: number; types: string[] }> = {};
  for (const fb of feedbackList.filter((f) => f.type === "not_accurate" || f.type === "not_good")) {
    const gen = generations.find((g) => g.id === fb.generationId);
    if (gen && fb.cardIndex !== undefined && gen.results[fb.cardIndex]) {
      const event = gen.results[fb.cardIndex];
      const key = `${event.title}-${event.team}-${event.year}`;
      if (!eventFlags[key]) eventFlags[key] = { title: `${event.title} (${event.team}, ${event.year})`, count: 0, types: [] };
      eventFlags[key].count++;
      eventFlags[key].types.push(fb.type);
    }
  }
  const flaggedEvents = Object.values(eventFlags).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <main className="flex-1 px-4 py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Eval Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor ranking accuracy and quality over time</p>
          </div>
          <Link href="/query" className="px-4 py-2 rounded-lg bg-gold text-navy font-semibold text-sm hover:bg-gold/90 transition-colors">
            ← Generate
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard label="Generations" value={String(generations.length)} />
          <StatCard label="Accuracy" value={`${accuracyRate}%`} sub={`${notAccurate} flags / ${totalCards} cards`} color={Number(accuracyRate) > 80 ? "text-green-400" : "text-red-400"} />
          <StatCard label="Quality" value={`${qualityRate}%`} sub={`${notGood} flags / ${totalCards} cards`} color={Number(qualityRate) > 80 ? "text-green-400" : "text-orange-400"} />
          <StatCard label="Avg Reorder" value={avgReorderDistance} sub={`${reorders.length} reorders`} color={Number(avgReorderDistance) < 2 ? "text-green-400" : "text-yellow-400"} />
        </div>

        {/* Ranking Accuracy */}
        <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Ranking Accuracy</h2>
          <p className="text-gray-400 text-sm mb-4">How often does the user agree with each rank position?</p>
          {totalReorders === 0 ? (
            <p className="text-gray-500 text-sm italic">No reorder data yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((pos) => {
                const pct = ((rankAcceptance[pos - 1] / totalReorders) * 100).toFixed(0);
                return (
                  <div key={pos} className="text-center">
                    <div className="text-3xl font-bold text-gold mb-1">{pct}%</div>
                    <div className="text-sm text-gray-400">Rank #{pos} correct</div>
                    <div className="mt-2 h-2 bg-navy rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Performance by City */}
        <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Performance by City</h2>
          {Object.keys(cityStats).length === 0 ? (
            <p className="text-gray-500 text-sm italic">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-navy-lighter">
                    <th className="text-left py-2 pr-4">City</th>
                    <th className="text-right py-2 px-2">Gens</th>
                    <th className="text-right py-2 px-2">Accuracy</th>
                    <th className="text-right py-2 px-2">Quality</th>
                    <th className="text-right py-2 pl-2">Avg Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cityStats).sort((a, b) => b[1].total - a[1].total).map(([city, stats]) => {
                    const cityCards = stats.total * 3;
                    const acc = ((stats.accurate / cityCards) * 100).toFixed(0);
                    const qual = ((stats.good / cityCards) * 100).toFixed(0);
                    const avgR = stats.reorders > 0 ? (stats.reorderDist / stats.reorders).toFixed(1) : "—";
                    return (
                      <tr key={city} className="border-b border-navy-lighter/50">
                        <td className="py-2 pr-4 font-medium">{city}</td>
                        <td className="text-right py-2 px-2 text-gray-400">{stats.total}</td>
                        <td className={`text-right py-2 px-2 ${Number(acc) > 80 ? "text-green-400" : "text-red-400"}`}>{acc}%</td>
                        <td className={`text-right py-2 px-2 ${Number(qual) > 80 ? "text-green-400" : "text-orange-400"}`}>{qual}%</td>
                        <td className="text-right py-2 pl-2 text-gray-400">{avgR}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Most Flagged Events */}
        <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Most Flagged Events</h2>
          {flaggedEvents.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No flags yet.</p>
          ) : (
            <div className="space-y-2">
              {flaggedEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-navy-lighter/50 last:border-0">
                  <span className="text-sm">{event.title}</span>
                  <div className="flex gap-2">
                    <span className="text-xs text-red-400">{event.types.filter((t) => t === "not_accurate").length} inaccurate</span>
                    <span className="text-xs text-orange-400">{event.types.filter((t) => t === "not_good").length} poor</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Feedback */}
        <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Recent Feedback</h2>
          {freeformFeedback.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No freeform feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {freeformFeedback.slice(-10).reverse().map((fb) => {
                const gen = generations.find((g) => g.id === fb.generationId);
                return (
                  <div key={fb.id} className="bg-navy rounded-lg p-3 border border-navy-lighter/30">
                    <p className="text-sm text-gray-300 mb-1">&ldquo;{fb.freeformText}&rdquo;</p>
                    <p className="text-xs text-gray-500">{gen ? `${gen.city}, ${gen.decade}` : "Unknown"} — {new Date(fb.createdAt).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Generations */}
        <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Generations</h2>
          {generations.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No generations yet.</p>
          ) : (
            <div className="space-y-2">
              {generations.slice(-15).reverse().map((gen) => {
                const genFb = feedbackList.filter((f) => f.generationId === gen.id);
                const flags = genFb.filter((f) => f.type === "not_accurate" || f.type === "not_good").length;
                return (
                  <div key={gen.id} className="flex items-center justify-between py-2 border-b border-navy-lighter/50 last:border-0 text-sm">
                    <div>
                      <span className="font-medium">{gen.city}</span>
                      <span className="text-gray-400 ml-2">{gen.decade}</span>
                      <span className="text-gray-500 ml-2 text-xs">{gen.model}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {flags > 0 && <span className="text-xs text-red-400">{flags} flags</span>}
                      <span className="text-xs text-gray-500">{new Date(gen.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-navy-light rounded-xl border border-navy-lighter p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
