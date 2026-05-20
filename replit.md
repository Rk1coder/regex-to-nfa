# Thompson NFA Studio

A desktop-style web application that converts Regular Expressions to NFAs using Thompson's Construction Algorithm, step by step. An educational tool for students studying Formal Languages and Automata Theory, with a "scientific dark lab" aesthetic.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- **Frontend**: React + Vite, Cytoscape.js (graph), cytoscape-dagre (layout), xlsx (SheetJS for Excel)

## Where things live

- `artifacts/thompson-nfa-studio/src/thompson.ts` — Thompson's construction algorithm (recursive descent parser + NFA builder)
- `artifacts/thompson-nfa-studio/src/fileUtils.ts` — JSON/TXT/CSV/XLSX import and NFA JSON/CSV export
- `artifacts/thompson-nfa-studio/src/components/` — UI components (InputPanel, GraphView, TransitionTable, StepPanel, FileImporter)
- `artifacts/thompson-nfa-studio/public/examples/` — 3 example NFA JSON files
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture decisions

- Frontend-only: Thompson NFA Studio requires no backend — all conversion logic runs in the browser via `thompson.ts`
- Cytoscape.js with dagre layout renders the NFA graph left-to-right; node/edge styles are defined inline in GraphView.tsx
- Each conversion step captures a full NFA snapshot (`currentNFA`) so the step-by-step panel can rewind/replay without recomputing
- `cytoscape-dagre` has no TypeScript types; imported with `as any` cast to suppress TS errors
- UI is built with custom CSS via Tailwind utility classes; no external UI component libraries (except shadcn Toaster for notifications)

## Product

- Convert any regex (|, *, +, ?, parentheses, concatenation) to an NFA via Thompson's Construction
- Step-by-step walkthrough with animated graph building
- Import NFA from JSON, TXT (regex), CSV, or Excel files
- Export NFA as JSON or CSV transition table; export graph as PNG
- All UI copy is in Turkish
- Three built-in presets: (a|b)*abb, a*b+, (ab|c)?d

## User preferences

- All UI text in Turkish
- Scientific dark lab aesthetic (#0d1117 background, cyan/blue accents, amber epsilon transitions, green accept states)
- Custom CSS only — no component library for main design
- No emojis in UI

## Gotchas

- Run `pnpm install` after changing package.json (cytoscape-dagre, xlsx are in `dependencies`, not `devDependencies`)
- After removing `@workspace/api-client-react` dep, the `tsconfig.json` references must also be cleared to avoid TS2742 errors

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
