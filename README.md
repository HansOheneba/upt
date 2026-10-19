# United Pension Trustees Client Dashboard

Client portal for United Pension Trustees: onboarding, pension and financial goals, cash flow, assets, insurance, properties, liabilities, retirement planning, and an AI assistant.

This repository is a copy of the Celerey client frontend so United Pension Trustees can diverge on product features. Branding still comes from `NEXT_PUBLIC_TENANT` (default `upt`). See [Multi-brand / white-label deployments](#multi-brand--white-label-deployments) below.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript (strict)
- [Zustand](https://github.com/pmndrs/zustand) for client-side state
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- react-hook-form + Zod for forms/validation

See [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for a full architecture overview, [docs/architecture/CODING_STANDARDS.md](docs/architecture/CODING_STANDARDS.md) for conventions, and [docs/architecture/API_LAYER.md](docs/architecture/API_LAYER.md) for how the backend proxy works.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in real values (see a team member or the deployment platform):

```
NEXT_PUBLIC_TENANT
NEXT_PUBLIC_BASE_API_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_CORE_SUBSCRIPTION_URL_7DAYS_TRIAL
NEXT_PUBLIC_CORE_SUBSCRIPTION_URL_PREMIUM
NEXT_PUBLIC_CORE_SUBSCRIPTION_PRICE_ID
NEXT_PUBLIC_DEMO_USER
NEXT_PUBLIC_GOOGLE_API_KEY
DEEPSEEK_API_KEY
DEMO_AI_ENABLED
```

Never commit real values for these; `.env*` is gitignored.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (uses `NEXT_PUBLIC_TENANT` from `.env.local`, defaults to `upt`) |
| `npm run dev:upt` | Start the dev server as United Pension Trustees |
| `npm run dev:celerey` | Start the dev server as the `celerey` brand |
| `npm run dev:ecobank` | Start the dev server as the `ecobank` brand |
| `npm run dev:stanbic` | Start the dev server as the `stanbic` brand (Stanbic Investment Management Services) |
| `npm run dev:absa` | Start the dev server as the `absa` brand (Absa Bank Ghana) |
| `npm run dev:gcb` | Start the dev server as the `gcb` brand (GCB Bank PLC) |
| `npm run dev:fidelity` | Start the dev server as the `fidelity` brand (Fidelity Bank Ghana) |
| `npm run dev:access` | Start the dev server as the `access` brand (Access Bank Ghana) |
| `npm run dev:omnibsic` | Start the dev server as the `omnibsic` brand (OmniBSIC Bank) |
| `npm run dev:fnb` | Start the dev server as the `fnb` brand (FNB Ghana / FirstRand) |
| `npm run dev:petra` | Start the dev server as the `petra` brand (Petra) |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Run a production build locally |
| `npm run lint` | Run ESLint |

## Multi-brand / white-label deployments

This app supports deploying the same codebase as multiple branded products (different logo, colors, and product name) via a single `NEXT_PUBLIC_TENANT` env var per deployment. See [docs/architecture/WHITE_LABELING.md](docs/architecture/WHITE_LABELING.md) for how tenant resolution works, how to add a new brand, and which env vars are public vs. private.

## Documentation

- [Architecture overview](docs/architecture/ARCHITECTURE.md)
- [Coding standards](docs/architecture/CODING_STANDARDS.md)
- [API layer / backend proxy](docs/architecture/API_LAYER.md)
- [White-labeling / multi-brand deployments](docs/architecture/WHITE_LABELING.md)
- [Design system](docs/CELEREY_DESIGN_SYSTEM.md)

Documentation must be kept up to date alongside code changes; see [rules/documentation.mdc](rules/documentation.mdc).
