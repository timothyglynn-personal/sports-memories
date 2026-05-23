# AI Product Management Learnings

**From building the Sports Memories Eval Agent**

---

## 0. The Image Search Journey (Biggest Lesson)

Getting the right images for each memory was the hardest integration problem. Here's what we tried:

| Approach | Result | Why It Failed/Worked |
|----------|--------|---------------------|
| Unsplash Source API | Dead links | Service deprecated in 2023, returns nothing |
| Static Unsplash URLs per sport | Generic stadium photos | Not event-specific, no emotional connection |
| Wikipedia API (pageimages) | Mostly logos/generic | Wikipedia pages for events often lack thumbnails; team pages return logos not moments |
| Wikipedia with multi-query fallback | Better but still generic | Gets team images, not iconic event photos |
| Google Custom Search API | Never worked | Complex setup: need Search Engine ID + API key + "search entire web" toggle that's hidden in the UI |
| **Serper.dev (Google Images wrapper)** | **Iconic event photos** | **One API key, no other config, returns actual Google Image results** |

**PM Takeaways:**
* **Free APIs have severe limitations.** Wikipedia's image coverage is inconsistent. Unsplash deprecated their simple URL API. You often need a paid service for production quality.
* **Setup friction kills momentum.** Google Custom Search requires: a Google Cloud project, an API key, a Programmable Search Engine, enabling image search, enabling "search entire web." Serper.dev requires: sign up, copy key. Same underlying data (Google), 10x less friction.
* **Images are emotional, not decorative.** Generic stadium photos add nothing. The specific photo of Derek Jeter's walkoff or the Yankees celebrating — THAT conveys the feeling. Don't settle for "an image" when you need "THE image."
* **Budget for image search costs.** Serper.dev gives 2,500 free searches, then charges ~$50/month. At 3 images per generation, that's ~830 generations free. Plan your image strategy into your cost model.

---

## 1. Model Selection is a Product Decision

| Model | Provider | Latency | Accuracy | Cost/Request | Best For |
|-------|----------|---------|----------|-------------|----------|
| Claude Haiku 4.5 | Anthropic | ~1-2s | Good | ~$0.001 | Fast iteration, testing, high-volume |
| Claude Sonnet 4.6 | Anthropic | ~3-5s | Very Good | ~$0.01 | Production balanced workloads |
| Claude Opus 4.7 | Anthropic | ~8-15s | Excellent | ~$0.05 | Complex reasoning, nuance |
| GPT-4o Mini | OpenAI | ~1-2s | Good | ~$0.001 | Fast, general knowledge |
| GPT-4o | OpenAI | ~3-6s | Very Good | ~$0.01 | Broad knowledge, good structure |

**Key insight**: There is no "best model." The right choice depends on your latency budget, accuracy requirements, and cost constraints. Fast models hallucinate more. Premium models cost 50x more but rank better.

---

## 2. Latency is a UX Problem, Not Just a Technical One

* Users perceive >3s as "slow" for interactive tools
* >8s feels broken without a loading indicator
* Haiku/GPT-4o-mini feel instant; Opus feels like waiting for an expert

**PM decision**: Default to the fastest acceptable model for your use case. Let power users opt into slower/better models.

---

## 3. Evals Are How You Define "Good"

The hardest part of AI product work is not generating outputs — it's **defining what quality means**.

Our eval criteria for this app:
* **City Relevance** — Is the team actually from that city?
* **Decade Accuracy** — Is the year within range?
* **Sport Relevance** — Correct sport selected?
* **Factual Accuracy** — Real scores, real opponents, real outcomes?
* **Ranking Quality** — Cultural significance ordering correct?
* **Team Prominence** — Major teams featured, not obscure ones?
* **Emotional Resonance** — Would a local fan recognize this memory?
* **No Hallucination** — Everything verifiable?

**Key insight**: You can only improve what you measure. Define evals BEFORE building, then iterate them as you discover new failure modes.

---

## 4. Implicit vs Explicit Feedback Signals

| Signal Type | Example | What It Tells You |
|-------------|---------|-------------------|
| Explicit negative | "Not Accurate" button | Model factually wrong |
| Explicit quality | "Not A Good Example" button | Technically correct but culturally weak |
| Ranking preference | User reorders 2,1,3 | Model's prioritization is off |
| Ranking reason | "The 2009 series mattered more because..." | WHY the model's ranking logic is wrong — most valuable signal |
| Freeform critique | "Ignored baseball entirely" | Systematic blind spot |
| Regeneration | "Give Me Another" | Output wasn't satisfying (implicit) |
| Acceptance | No flags, no reorder | Output was good (implicit) |

**Key insight about ranking reasons:** The reorder alone tells you WHAT was wrong. The reason tells you WHY. "2,1,3" says "your #2 should be #1" but "The 2009 series was bigger because it was the first title in the new stadium" teaches you the CRITERIA the user values. This is the data that actually improves the prompt/model over time.

**Key insight**: The most valuable signal is when users DON'T interact. Silence = approval. But you only know this if you instrument everything.

---

## 5. Hallucination Patterns

Models hallucinate more when:
* The city is small/obscure (less training data)
* The sport is niche (cricket in America, NFL in Europe)
* The decade is old (pre-2000 data is sparser)
* The request combines unusual parameters

**PM mitigation strategies**:
* Prompt engineering: "Only include events that ACTUALLY HAPPENED"
* Add verification constraints: "Include real opponent, real score"
* Use retrieval (future): ground generations in a facts database
* User feedback loop: flag hallucinations → improve over time

---

## 6. Prompt Engineering is Product Design

The prompt IS the product spec for the AI. Changes in prompt wording directly change output quality:

* "Generate memories" → vague, invites hallucination
* "Recall REAL, VERIFIED sporting events only. Never invent." → constrains behavior
* "Rank by cultural significance to THAT CITY specifically" → shapes ranking logic
* "Include the real opponent, real score" → forces specificity

**Key insight**: Treat prompt iteration like UX iteration. Test with real users, measure outcomes, refine continuously.

---

## 7. The Cost of Getting It Wrong

| Failure Mode | User Impact | Trust Impact |
|-------------|-------------|--------------|
| Wrong city (Paris event for Manchester) | Immediately obvious | Destroys credibility |
| Wrong decade (2015 event for 1990-2000) | Noticeable | Reduces trust |
| Obscure team over famous one | Disappointing | Feels generic |
| Invented event (hallucination) | Confusing → infuriating if noticed | Catastrophic |
| Bad ranking (good event at #3) | Mild disagreement | Low impact |

**Key insight**: Not all errors are equal. Prioritize preventing catastrophic failures (hallucination, wrong city) over debatable ones (ranking order).

---

## 8. Multi-Model Strategy

Running the same task across models teaches you:
* Which models are better at what (Anthropic often better at nuance, OpenAI at breadth)
* Cost/quality tradeoffs at scale
* Whether your evals are model-independent (good) or model-specific (bad)

**PM recommendation**: Always support A/B testing between models. Your best model today may not be best tomorrow.

---

## 9. The Feedback Flywheel

```
Generate → User evaluates → Store feedback → Analyze patterns → Improve prompt/model → Generate better
```

This loop is the core product mechanic. Speed it up by:
* Making feedback effortless (one-click buttons)
* Showing the user their feedback matters (admin dashboard)
* Actually acting on patterns (prompt changes, model switches)

---

## 10. What I'd Do Differently Next Time

1. **Start with evals, not features** — Define "good" before building
2. **Ship the feedback loop first** — Even with terrible outputs, learning starts immediately
3. **Default to the fastest model** — Iterate on quality after UX is proven
4. **Instrument everything from day 1** — Latency, model, input params, user actions
5. **Test with diverse inputs early** — The app works for New York but might fail for smaller cities

---

## Technical Architecture Notes

* **Frontend**: Next.js App Router, Tailwind CSS, localStorage for V1 persistence
* **AI**: Anthropic SDK + OpenAI SDK, switchable per-request
* **Eval storage**: localStorage (V1) → Supabase (V2) for cross-device persistence
* **Deployment**: Vercel, env vars for API keys
* **Key pattern**: Generate → Store → Collect feedback → Aggregate metrics → Iterate
