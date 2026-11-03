---
name: frontend
description: "Implement Super App React frontend behavior using its Feature-Sliced Design, Effector and Material UI conventions; excludes the separate Next.js landing."
---

# Frontend implementation

Read `frontend/AGENTS.md`, `docs/conventions/frontend.md`, and relevant requirements.
For tests also read `docs/conventions/frontend-testing.md`. Work in the existing
FSD layers and public barrel APIs; model state in Effector using `sample`, namespace
models and scope-bound `useUnit`. Follow established styled components, Russian copy,
accessibility and error/loading/empty states. Inspect existing analogous features.

Implement the requested behavior with meaningful model/component tests. Use
`npm run check` while iterating; run affected full suites before delivery. For UI
changes use the local dev/QA stack to verify the actual scenario, including realtime
or multiple roles if affected. Report checks and any browser scenarios not verified.
Do not deploy or convert landing components to FSD/Effector.
