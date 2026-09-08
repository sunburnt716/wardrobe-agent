# wardrobe-agent
An agentic outfit picker built in TypeScript on Postgres + GraphQL Yoga. Hard constraints are enforced in code before the model is consulted; the agent writes only through a gated DAL action vocabulary. Includes a two-tier eval harness — deterministic invariants in CI, LLM-as-judge for quality.
