# AI Product Learnings

This project started as a simple game for asking an AI model to produce a city's greatest sporting memories. It quickly became clear that the product was not just a prompt. It needed a small agent loop: model selection, structured generation, external image search, feedback capture, and an admin surface for comparing performance.

The first failures were basic trust failures. The model could invent teams, include the wrong sport, pick events outside the requested decade, or return memories that sounded plausible but were not actually meaningful to local fans. Prompting helped, but it did not solve the problem alone. The product needed explicit eval criteria for factuality, city scope, sport scope, time period, ranking quality, image match, and sentiment.

The eval spreadsheet was introduced after those early failures, not at the very beginning. That timing was useful: the first product iterations exposed the real failure modes, and the spreadsheet turned them into repeatable tests. It includes positive anchors, like Manchester United's 1999 Champions League win for Manchester in the 1990s, and negative examples, like using that same memory for a 2010-2020 request where it should fail on time period.

The most important distinction was that "memorable" and "greatest" are not the same. A painful loss can be famous, but it should not be ranked as a top positive memory unless the user asks for painful memories. Likewise, a valid championship can still be a weak ranking if another memory is more culturally important, such as a drought-ending title, first championship, or dynasty-defining win.

The project also showed the tradeoff between human feedback, automated evals, and model-as-judge approaches. Human feedback is best for sentiment and local meaning, but it is sparse. Spreadsheet evals are repeatable and useful for regression testing. An LLM judge could help score outputs at scale, especially for first-pass classification, but it should not be the only source of truth for facts, image correctness, or local fan sentiment.

The current app reflects these learnings by using the eval dataset as prompt guardrails and by showing the dataset in the admin panel. This is not true model fine-tuning; it is eval-informed product iteration. For this stage of the product, that is the right tradeoff: faster to inspect, easier to change, and more transparent than training a custom model too early.
