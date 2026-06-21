# Sports Memories Eval Agent

A small AI product experiment for generating a city's greatest sporting memories and learning how model choice, tool use, feedback, and evals affect output quality.

The app asks for a city, decade, sport set, and model. It generates three candidate memories, fetches event images, collects user feedback, and exposes an admin dashboard for model and eval review.

## Eval Dataset

The project includes a spreadsheet-style eval dataset:

- CSV: [`evals/sports_memories_eval_dataset_v2.csv`](evals/sports_memories_eval_dataset_v2.csv)
- TSV for Google Sheets import: [`evals/sports_memories_eval_dataset_v2.tsv`](evals/sports_memories_eval_dataset_v2.tsv)

The dataset includes pass and fail examples for:

- hallucinated teams or events
- wrong sport
- wrong decade
- wrong image
- painful losses presented as "greatest" memories
- weak ranking of valid memories
- city/national-team scope errors

The app uses these examples as eval-informed prompt guardrails and shows them in the admin dashboard under `Eval Dataset`.

## Learning Note

See [`docs/ai-product-learnings.md`](docs/ai-product-learnings.md) for a short summary of the product and eval learnings from building this app.

## Running Locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Generation requires API keys for the configured model providers and image search:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SERPER_API_KEY`
