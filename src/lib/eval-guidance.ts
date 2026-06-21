export const EVAL_DATASET_VERSION = "sports_memories_eval_dataset_v2";

export const EVAL_DATASET_SUMMARY = {
  totalRows: 36,
  passRows: 10,
  failRows: 26,
  categories: [
    "hallucinated_team",
    "hallucinated_event",
    "team_did_not_exist",
    "wrong_sport",
    "wrong_decade",
    "wrong_image",
    "bad_memory_loss",
    "weak_ranking",
    "wrong_city_or_scope",
  ],
};

export const EVAL_GUARDRAILS = [
  "Reject invented teams, invented championships, and teams that did not exist in the requested period.",
  "Treat the requested sport and decade as hard constraints, even when a different memory is more famous.",
  "Greatest memories should be positive city/team memories by default; do not rank painful losses as top memories.",
  "Rank championships, first titles, drought-ending wins, dynasty-defining wins, and culturally iconic victories above ordinary regular-season moments.",
  "For image queries, include event year, team, opponent/player, and trophy/event context so the image matches the specific memory rather than just the team.",
  "Avoid national-team or host-city substitutions unless the team/event clearly represents the requested city.",
];

export const EVAL_EXAMPLES = [
  {
    caseId: "SME-001",
    type: "pass",
    input: "Manchester, 1990-2000, Soccer",
    output: "Manchester United win the 1999 UEFA Champions League Final",
    lesson: "Real team, correct sport, correct decade, iconic positive win.",
  },
  {
    caseId: "SME-019",
    type: "fail",
    input: "Manchester, 2010-2020, Soccer",
    output: "Manchester United win the 1999 UEFA Champions League Final",
    lesson: "Real and iconic can still be wrong when it violates the requested decade.",
  },
  {
    caseId: "SME-015",
    type: "fail",
    input: "New York, 2010-2020, Basketball",
    output: "New York Red Bulls win the 2013 Supporters Shield",
    lesson: "Correct city-region memories still fail when they ignore the requested sport.",
  },
  {
    caseId: "SME-028",
    type: "fail",
    input: "Buffalo, 1990-2000, NFL",
    output: "Wide Right Super Bowl XXV loss",
    lesson: "Memorable losses are not greatest positive memories unless the user asks for painful memories.",
  },
  {
    caseId: "SME-032",
    type: "fail",
    input: "Chicago, 1990-2000, Basketball",
    output: "1997 NBA Finals fifth championship ranked above 1998",
    lesson: "A valid memory can still be a weak rank when another memory has stronger historical significance.",
  },
];

export function formatEvalGuardrailsForPrompt() {
  return EVAL_GUARDRAILS.map((guardrail, index) => `${index + 1}. ${guardrail}`).join("\n");
}
