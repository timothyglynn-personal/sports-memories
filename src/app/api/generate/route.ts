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
    // Fallback: return mock data so app works without API keys
    return Response.json({
      memories: getMockMemories(city, decade, sports),
    });
  }
}

async function generateWithClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
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

  const text = completion.choices[0]?.message?.content || "[]";
  return JSON.parse(text);
}

function getMockMemories(city: string, decade: string, sports: string[]) {
  const sport = sports[0] || "Soccer";
  return [
    {
      rank: 1,
      title: `${city} Championship Victory`,
      team: `${city} United`,
      year: parseInt(decade.split("-")[0]) + 5,
      sport,
      blurb: `The crowd erupted as ${city} United clinched the championship in dramatic fashion. It was a moment that united the entire city, from downtown pubs to living rooms across the suburbs. Decades later, fans still talk about where they were that night.`,
    },
    {
      rank: 2,
      title: `The Miracle Comeback`,
      team: `${city} Legends`,
      year: parseInt(decade.split("-")[0]) + 3,
      sport: sports[1] || sport,
      blurb: `Down by what seemed an insurmountable margin, ${city} Legends staged the greatest comeback in franchise history. The final play has been replayed millions of times, and the roar of the crowd could be heard blocks away. It redefined what this city believed was possible.`,
    },
    {
      rank: 3,
      title: `The Dynasty Season`,
      team: `${city} Royals`,
      year: parseInt(decade.split("-")[0]) + 8,
      sport: sports[2] || sport,
      blurb: `${city} Royals dominated from start to finish, going on a historic winning streak that captivated the nation. Every game felt like an event, with the stadium packed to capacity week after week. This team didn't just win—they inspired a generation of young athletes.`,
    },
  ];
}
