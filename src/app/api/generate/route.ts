import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { city, decade, sports, model } = await request.json();

  const prompt = `You are a sports historian. Your job is to recall REAL, VERIFIED sporting events only. Never invent or fabricate events.

For the city of "${city}" during the period ${decade}, considering these sports: ${sports.join(", ")}.

Rules:
- Only include events that ACTUALLY HAPPENED. Real championships, real games, real moments.
- Identify the MAJOR teams from that city (e.g. Manchester = Manchester United, Manchester City; Chicago = Bulls, Bears, Cubs, White Sox, Blackhawks)
- Rank by cultural significance to THAT CITY specifically — a World Series win matters more than a regular season record
- The year MUST fall within the ${decade} range
- The team MUST actually be based in or represent ${city}
- Include the real opponent, real score, or real context where possible

Generate the top 3 greatest REAL sporting memories. For each provide: title (the actual event name), team (real team name), year (exact year it happened), sport, and a 3-sentence blurb explaining why this was legendary for the city. Be specific with real player names, real scores, real opponents.

Return JSON array of 3 objects with fields: title, team, year, sport, blurb, rank (1-3). Return ONLY valid JSON, no markdown.`;

  try {
    let memories;

    if (model === "gpt4") {
      memories = await generateWithOpenAI(prompt);
    } else {
      memories = await generateWithClaude(prompt);
    }

    return Response.json({ memories });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

async function generateWithClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  let text = message.content[0].type === "text" ? message.content[0].text : "";
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(text);
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OPENAI_API_KEY");

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });

  let text = completion.choices[0]?.message?.content || "[]";
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(text);
}

