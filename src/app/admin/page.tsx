"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EVAL_DATASET_SUMMARY, EVAL_DATASET_VERSION, EVAL_EXAMPLES, EVAL_GUARDRAILS } from "@/lib/eval-guidance";

interface Generation {
  id: string;
  city: string;
  decade: string;
  sports: string[];
  model: string;
  modelId?: string;
  provider?: string;
  latencyMs?: number;
  results: { title: string; team: string; year: number; sport: string; blurb: string; rank: number }[];
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

interface EvalCriteria {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_EVALS: EvalCriteria[] = [
  { id: "city_match", name: "City Relevance", description: "Is the team/event actually from the specified city?", enabled: true },
  { id: "decade_match", name: "Decade Accuracy", description: "Does the event year fall within the selected decade?", enabled: true },
  { id: "sport_match", name: "Sport Relevance", description: "Is the event from one of the selected sports?", enabled: true },
  { id: "factual", name: "Factual Accuracy", description: "Are the scores, opponents, player names, and outcomes real and correct?", enabled: true },
  { id: "ranking_quality", name: "Ranking Quality", description: "Are events ranked by cultural significance to that city (not just recency)?", enabled: true },
  { id: "team_prominence", name: "Team Prominence", description: "Does it feature the city's most prominent/beloved teams rather than minor ones?", enabled: true },
  { id: "emotional_resonance", name: "Emotional Resonance", description: "Would a fan from that city recognize this as a defining memory?", enabled: true },
  { id: "no_hallucination", name: "No Hallucination", description: "Are all facts verifiable? No invented events, fake scores, or wrong attributions?", enabled: true },
];

export default function AdminPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [evals, setEvals] = useState<EvalCriteria[]>(DEFAULT_EVALS);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "models" | "training" | "evals">("dashboard");
  const [editingEval, setEditingEval] = useState<string | null>(null);
  const [newEvalName, setNewEvalName] = useState("");
  const [newEvalDesc, setNewEvalDesc] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setGenerations(JSON.parse(localStorage.getItem("generations") || "[]"));
      setFeedbackList(JSON.parse(localStorage.getItem("feedback") || "[]"));
      const storedEvals = localStorage.getItem("eval_criteria");
      if (storedEvals) setEvals(JSON.parse(storedEvals));
      setMounted(true);
    });
  }, []);

  function saveEvals(updated: EvalCriteria[]) {
    setEvals(updated);
    localStorage.setItem("eval_criteria", JSON.stringify(updated));
  }

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
        return sum + parts.reduce((d, val, idx) => d + Math.abs(val - (idx + 1)), 0);
      }, 0) / reorders.length).toFixed(2)
    : "—";

  // Model comparison stats
  const modelStats: Record<string, { generations: number; avgLatency: number; flags: number; cards: number; reorders: number; reorderDist: number }> = {};
  for (const gen of generations) {
    const key = gen.modelId || gen.model || "unknown";
    if (!modelStats[key]) modelStats[key] = { generations: 0, avgLatency: 0, flags: 0, cards: 0, reorders: 0, reorderDist: 0 };
    modelStats[key].generations++;
    modelStats[key].avgLatency += gen.latencyMs || 0;
    modelStats[key].cards += 3;
    const genFb = feedbackList.filter((f) => f.generationId === gen.id);
    modelStats[key].flags += genFb.filter((f) => f.type === "not_accurate" || f.type === "not_good").length;
    const reorder = genFb.find((f) => f.type === "reorder");
    if (reorder) {
      modelStats[key].reorders++;
      const parts = reorder.reorderValue?.split(",").map((s) => parseInt(s.trim())) || [1, 2, 3];
      modelStats[key].reorderDist += parts.reduce((d, val, idx) => d + Math.abs(val - (idx + 1)), 0);
    }
  }

  // Rank acceptance
  const rankAcceptance = [0, 0, 0];
  for (const r of reorders) {
    const parts = r.reorderValue?.split(",").map((s) => parseInt(s.trim())) || [];
    if (parts.length === 3) parts.forEach((val, idx) => { if (val === idx + 1) rankAcceptance[idx]++; });
  }

  // City stats
  const cityStats: Record<string, { total: number; flags: number }> = {};
  for (const gen of generations) {
    if (!cityStats[gen.city]) cityStats[gen.city] = { total: 0, flags: 0 };
    cityStats[gen.city].total++;
    cityStats[gen.city].flags += feedbackList.filter((f) => f.generationId === gen.id && (f.type === "not_accurate" || f.type === "not_good")).length;
  }

  return (
    <main className="flex-1 px-4 py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Eval Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor, compare, and configure evaluations</p>
          </div>
          <Link href="/query" className="px-4 py-2 rounded-lg bg-gold text-navy font-semibold text-sm hover:bg-gold/90 transition-colors">← Generate</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-navy-light rounded-lg p-1 border border-navy-lighter">
          {(["dashboard", "models", "training", "evals"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === tab ? "bg-gold text-navy" : "text-gray-400 hover:text-white"}`}>
              {tab === "dashboard" ? "Performance" : tab === "models" ? "Model Comparison" : tab === "training" ? "Eval Dataset" : "Eval Criteria"}
            </button>
          ))}
        </div>

        {/* TAB: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Generations" value={String(generations.length)} />
              <StatCard label="Accuracy" value={`${accuracyRate}%`} sub={`${notAccurate} flags`} color={Number(accuracyRate) > 80 ? "text-green-400" : "text-red-400"} />
              <StatCard label="Quality" value={`${qualityRate}%`} sub={`${notGood} flags`} color={Number(qualityRate) > 80 ? "text-green-400" : "text-orange-400"} />
              <StatCard label="Avg Reorder" value={avgReorderDistance} sub={`${reorders.length} submitted`} color={Number(avgReorderDistance) < 2 ? "text-green-400" : "text-yellow-400"} />
            </div>

            {/* Rank accuracy */}
            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Ranking Accuracy</h2>
              {reorders.length === 0 ? <p className="text-gray-500 text-sm italic">No reorder data yet.</p> : (
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((pos) => {
                    const pct = ((rankAcceptance[pos - 1] / reorders.length) * 100).toFixed(0);
                    return (
                      <div key={pos} className="text-center">
                        <div className="text-3xl font-bold text-gold">{pct}%</div>
                        <div className="text-xs text-gray-400">Rank #{pos} correct</div>
                        <div className="mt-2 h-2 bg-navy rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* City breakdown */}
            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Performance by City</h2>
              {Object.keys(cityStats).length === 0 ? <p className="text-gray-500 text-sm italic">No data yet.</p> : (
                <div className="space-y-2">
                  {Object.entries(cityStats).sort((a, b) => b[1].total - a[1].total).slice(0, 10).map(([city, s]) => (
                    <div key={city} className="flex items-center justify-between py-1.5 border-b border-navy-lighter/50 last:border-0 text-sm">
                      <span className="font-medium">{city}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-gray-400">{s.total} gens</span>
                        <span className={s.flags === 0 ? "text-green-400" : "text-red-400"}>{s.flags} flags</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent feedback */}
            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Recent Feedback</h2>
              {freeformFeedback.length === 0 ? <p className="text-gray-500 text-sm italic">No freeform feedback yet.</p> : (
                <div className="space-y-2">
                  {freeformFeedback.slice(-8).reverse().map((fb) => {
                    const gen = generations.find((g) => g.id === fb.generationId);
                    return (
                      <div key={fb.id} className="bg-navy rounded-lg p-3 border border-navy-lighter/30">
                        <p className="text-sm text-gray-300">&ldquo;{fb.freeformText}&rdquo;</p>
                        <p className="text-xs text-gray-500 mt-1">{gen ? `${gen.city}, ${gen.decade}` : ""} — {new Date(fb.createdAt).toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB: Model Comparison */}
        {activeTab === "models" && (
          <div className="space-y-6">
            <p className="text-gray-400 text-sm">Compare accuracy, latency, and quality across different AI models.</p>
            {Object.keys(modelStats).length === 0 ? (
              <div className="bg-navy-light rounded-xl border border-navy-lighter p-8 text-center">
                <p className="text-gray-500">No data yet. Generate memories with different models to see comparisons.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-navy-lighter">
                      <th className="text-left py-3 pr-4">Model</th>
                      <th className="text-right py-3 px-3">Runs</th>
                      <th className="text-right py-3 px-3">Avg Latency</th>
                      <th className="text-right py-3 px-3">Accuracy</th>
                      <th className="text-right py-3 px-3">Avg Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modelStats).sort((a, b) => b[1].generations - a[1].generations).map(([modelName, stats]) => {
                      const acc = ((stats.cards - stats.flags) / stats.cards * 100).toFixed(0);
                      const avgLat = stats.generations > 0 ? Math.round(stats.avgLatency / stats.generations) : 0;
                      const avgR = stats.reorders > 0 ? (stats.reorderDist / stats.reorders).toFixed(1) : "—";
                      return (
                        <tr key={modelName} className="border-b border-navy-lighter/50">
                          <td className="py-3 pr-4">
                            <span className="font-medium">{modelName}</span>
                          </td>
                          <td className="text-right py-3 px-3 text-gray-400">{stats.generations}</td>
                          <td className="text-right py-3 px-3">
                            {avgLat > 0 ? (
                              <span className={avgLat < 2000 ? "text-green-400" : avgLat < 5000 ? "text-yellow-400" : "text-red-400"}>
                                {(avgLat / 1000).toFixed(1)}s
                              </span>
                            ) : <span className="text-gray-500">—</span>}
                          </td>
                          <td className={`text-right py-3 px-3 ${Number(acc) > 80 ? "text-green-400" : "text-red-400"}`}>{acc}%</td>
                          <td className="text-right py-3 px-3 text-gray-400">{avgR}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h3 className="text-sm font-semibold mb-3 text-gold">PM Insight: Model Tradeoffs</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <p><strong className="text-gray-300">Latency vs Quality:</strong> Faster models (Haiku, GPT-4o Mini) respond in 1-2s but may miss nuance. Premium models (Opus, GPT-4o) take 5-10s but rank better.</p>
                <p><strong className="text-gray-300">Cost scaling:</strong> Haiku costs ~$0.001/request, Opus ~$0.05/request. At scale, this 50x difference matters for product margins.</p>
                <p><strong className="text-gray-300">Hallucination patterns:</strong> Faster models hallucinate more on niche sports/cities. Premium models are more honest about uncertainty.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Eval Dataset */}
        {activeTab === "training" && (
          <div className="space-y-6">
            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Eval-Informed Guidance</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    The generation prompt now includes guardrails derived from {EVAL_DATASET_VERSION}.
                  </p>
                </div>
                <Link href="/evals/sports_memories_eval_dataset_v2.tsv" className="text-sm text-gold hover:text-gold/80">
                  Download TSV
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <StatCard label="Eval Rows" value={String(EVAL_DATASET_SUMMARY.totalRows)} />
                <StatCard label="Pass Anchors" value={String(EVAL_DATASET_SUMMARY.passRows)} color="text-green-400" />
                <StatCard label="Fail Cases" value={String(EVAL_DATASET_SUMMARY.failRows)} color="text-red-400" />
              </div>

              <div className="flex flex-wrap gap-2">
                {EVAL_DATASET_SUMMARY.categories.map((category) => (
                  <span key={category} className="px-2 py-1 rounded bg-navy border border-navy-lighter text-xs text-gray-300">
                    {category}
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Runtime Guardrails</h2>
              <div className="space-y-2">
                {EVAL_GUARDRAILS.map((guardrail, index) => (
                  <div key={guardrail} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-gold font-semibold">{index + 1}</span>
                    <p>{guardrail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-navy-light rounded-xl border border-navy-lighter p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Example Eval Cases</h2>
              <div className="space-y-3">
                {EVAL_EXAMPLES.map((example) => (
                  <div key={example.caseId} className="bg-navy rounded-lg p-3 border border-navy-lighter/40">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 font-mono">{example.caseId}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${example.type === "pass" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
                        {example.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300"><span className="text-gray-500">Input:</span> {example.input}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-500">Output:</span> {example.output}</p>
                    <p className="text-xs text-gray-400 mt-2">{example.lesson}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB: Eval Criteria */}
        {activeTab === "evals" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Define what &ldquo;good&rdquo; means. These criteria determine how you evaluate the agent&apos;s outputs.</p>
            </div>

            <div className="space-y-3">
              {evals.map((ev) => (
                <div key={ev.id} className={`bg-navy-light rounded-xl border p-4 transition-colors ${ev.enabled ? "border-navy-lighter" : "border-navy-lighter/30 opacity-60"}`}>
                  {editingEval === ev.id ? (
                    <div className="space-y-2">
                      <input type="text" value={ev.name} onChange={(e) => saveEvals(evals.map((x) => x.id === ev.id ? { ...x, name: e.target.value } : x))}
                        className="w-full bg-navy border border-navy-lighter rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold" />
                      <textarea value={ev.description} onChange={(e) => saveEvals(evals.map((x) => x.id === ev.id ? { ...x, description: e.target.value } : x))} rows={2}
                        className="w-full bg-navy border border-navy-lighter rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gold resize-none" />
                      <button onClick={() => setEditingEval(null)} className="text-xs text-gold">Done</button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ev.enabled ? "bg-green-400" : "bg-gray-600"}`} />
                          <h3 className="text-sm font-medium">{ev.name}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-4">{ev.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingEval(ev.id)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                        <button onClick={() => saveEvals(evals.map((x) => x.id === ev.id ? { ...x, enabled: !x.enabled } : x))}
                          className={`text-xs ${ev.enabled ? "text-orange-400" : "text-green-400"}`}>
                          {ev.enabled ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => saveEvals(evals.filter((x) => x.id !== ev.id))} className="text-xs text-red-400">Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new eval */}
            <div className="bg-navy-light rounded-xl border border-navy-lighter p-4">
              <h3 className="text-sm font-semibold mb-3">Add New Eval Criterion</h3>
              <div className="space-y-2">
                <input type="text" value={newEvalName} onChange={(e) => setNewEvalName(e.target.value)} placeholder="Criterion name (e.g. 'Recency Bias')"
                  className="w-full bg-navy border border-navy-lighter rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold" />
                <input type="text" value={newEvalDesc} onChange={(e) => setNewEvalDesc(e.target.value)} placeholder="Description (e.g. 'Does it over-weight recent events vs historic ones?')"
                  className="w-full bg-navy border border-navy-lighter rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold" />
                <button onClick={() => {
                  if (newEvalName.trim()) {
                    saveEvals([...evals, { id: crypto.randomUUID(), name: newEvalName.trim(), description: newEvalDesc.trim(), enabled: true }]);
                    setNewEvalName("");
                    setNewEvalDesc("");
                  }
                }} className="px-4 py-2 bg-gold text-navy rounded text-sm font-semibold hover:bg-gold/90">Add Criterion</button>
              </div>
            </div>

            <div className="bg-navy rounded-xl border border-navy-lighter/30 p-4">
              <h3 className="text-sm font-semibold mb-2 text-gold">PM Insight: What Makes a Good Eval?</h3>
              <div className="space-y-1 text-xs text-gray-400">
                <p>* <strong className="text-gray-300">Measurable:</strong> Can a human clearly judge pass/fail? Avoid vague criteria.</p>
                <p>* <strong className="text-gray-300">Independent:</strong> Each eval should test one thing. Don&apos;t combine &ldquo;accurate AND well-ranked&rdquo;.</p>
                <p>* <strong className="text-gray-300">Weighted:</strong> Not all evals matter equally. Factual accuracy &gt; emotional resonance for trust.</p>
                <p>* <strong className="text-gray-300">Evolving:</strong> Add evals as you discover new failure modes. Remove ones that always pass.</p>
              </div>
            </div>
          </div>
        )}
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
