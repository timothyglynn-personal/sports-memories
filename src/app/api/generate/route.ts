import { NextRequest } from "next/server";
import { EVAL_DATASET_VERSION, formatEvalGuardrailsForPrompt } from "@/lib/eval-guidance";

const MODEL_MAP: Record<string, { provider: "anthropic" | "openai"; modelId: string }> = {
  haiku: { provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  sonnet: { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  opus: { provider: "anthropic", modelId: "claude-opus-4-7" },
  "gpt4o-mini": { provider: "openai", modelId: "gpt-4o-mini" },
  gpt4o: { provider: "openai", modelId: "gpt-4o" },
  // Legacy support
  claude: { provider: "anthropic", modelId: "claude-haiku-4-5-20251001" },
  gpt4: { provider: "openai", modelId: "gpt-4o-mini" },
};

export async function POST(request: NextRequest) {
  const { city, decade, sports, model } = await request.json();

  const prompt = `You are a sports historian. Your job is to recall REAL, VERIFIED sporting events only. Never invent or fabricate events.

This product has an eval dataset (${EVAL_DATASET_VERSION}) covering hallucinated teams/events, wrong sport, wrong decade, wrong images, painful losses, weak ranking, and city/national-team scope errors. Apply these eval-derived guardrails:
${formatEvalGuardrailsForPrompt()}

For the city of "${city}" during the period ${decade}, considering these sports: ${sports.join(", ")}.

Rules:
- Only include events that ACTUALLY HAPPENED. Real championships, real games, real moments.
- Identify the MAJOR teams from that city (e.g. Manchester = Manchester United, Manchester City; Chicago = Bulls, Bears, Cubs, White Sox, Blackhawks)
- Rank by cultural significance to THAT CITY specifically — a World Series win matters more than a regular season record
- Prefer beloved wins, titles, comeback victories, first championships, drought-ending wins, and dynasty-defining moments. Do not treat painful losses as "greatest memories" unless the user explicitly asks for them.
- The year MUST fall within the ${decade} range
- The team MUST actually be based in or represent ${city}
- The sport MUST be one of the selected sports: ${sports.join(", ")}
- Include the real opponent, real score, or real context where possible

Generate the top 3 greatest REAL sporting memories. For each provide: title (the actual event name), team (real team name), year (exact year it happened), sport, a 2-sentence blurb explaining why this was legendary for the city (be specific with real player names, scores, opponents), and an image_query (a short search phrase for finding a photo of this event, e.g. "Derek Jeter 2001 World Series home run").

Return JSON array of 3 objects with fields: title, team, year, sport, blurb, image_query, rank (1-3). Return ONLY valid JSON, no markdown.`;

  const modelConfig = MODEL_MAP[model] || MODEL_MAP.haiku;
  const startTime = Date.now();

  try {
    let memories;

    if (modelConfig.provider === "openai") {
      memories = await generateWithOpenAI(prompt, modelConfig.modelId);
    } else {
      memories = await generateWithClaude(prompt, modelConfig.modelId);
    }

    // Fetch real images from Wikipedia for each memory
    const memoriesWithImages = await Promise.all(
      memories.map(async (memory: { title: string; team: string; year: number; sport: string; image_query?: string; [key: string]: unknown }) => {
        const query = memory.image_query || `${memory.title} ${memory.team} ${memory.year}`;
        const imageUrl = await fetchEventImage(query);
        return { ...memory, image_url: imageUrl };
      })
    );

    const latencyMs = Date.now() - startTime;
    return Response.json({ memories: memoriesWithImages, meta: { model: modelConfig.modelId, provider: modelConfig.provider, latencyMs } });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

async function generateWithClaude(prompt: string, modelId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: modelId,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  let text = message.content[0].type === "text" ? message.content[0].text : "";
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(text);
}

async function generateWithOpenAI(prompt: string, modelId: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OPENAI_API_KEY");

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
  });

  let text = completion.choices[0]?.message?.content || "[]";
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(text);
}

async function fetchEventImage(query: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 1 }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data?.images?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}
