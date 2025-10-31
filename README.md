git clone https://github.com/sonalmogra28/benefitsaichatbot.git
# Benefits Assistant Chatbot

Production-grade Next.js (App Router) SaaS for benefits automation. This repo ships only code ready for Vercel Preview/Production deployments.

## 1. Prerequisites
- Node.js 20
- npm 10+
- Vercel CLI (`npm i -g vercel`)
- Azure resources for OpenAI, Cosmos, Storage, Redis (keys stored in Vercel env)

## 2. Local Setup
```bash
git clone <repo-url>
cd benefitsaichatbot-383
cp .env.example .env.local   # populate via Vercel env pull
npm ci
npm run dev
```

## 3. npm Scripts
| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Node 20) |
| `npm run build` | Production bundle (Vercel parity) |
| `npm run start` | Serve production build locally |
| `npm run lint` | ESLint sanity check |
| `npm run typecheck` | TypeScript strict mode |
| `npm run test` | Unit/integration tests (Vitest) |

## 4. Environment Management
- All secrets live in Vercel project settings.
- `.env.local` is generated via `vercel env pull` for local work; never commit.
- Required variables documented in `.env.example`.

## 5. Health Endpoints
- `GET /api/ready` → basic readiness (runtime + env sanity)
- `GET /api/health` → high-level service status

## 6. Deployments (Vercel Only)
1. `vercel` → Preview environment
2. `vercel --prod` → Production environment
3. Configure Preview/Production environment variables in Vercel dashboard for:
   - `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`
   - `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `REDIS_URL`, `RATE_LIMIT_REDIS_URL`
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - `DOMAIN_ROOT`

## 7. Rollback Plan
Trigger rollback from Vercel UI by promoting the last green deployment. Ensure environment variables remain untouched.

## 8. Repo Guardrails
- `.gitignore` excludes secrets, build artifacts, binaries.
- Local pre-push hook scans for accidental secrets (see below).
- Run `npm run lint && npm run typecheck && npm run build` before opening PRs.

## Bootstrap Step 1 — Repo Hygiene & Scaffolding

- Verified presence of core files: `.gitignore`, `.env.example`, `README.md`, `package.json`, `tsconfig.json`.
- Ensured health endpoints exist: `app/api/ready/route.ts`, `app/api/health/route.ts`.
- Fixed `.gitignore` to stop ignoring Markdown files (so docs like `README.md` are tracked).
- Confirmed scripts in `package.json`: `dev`, `build`, `lint`, `typecheck`, `test` (Vitest).
- Installed pre-push secret scan hook at `.git/hooks/pre-push`.

Next: run validation (typecheck, lint, build) and smoke-test endpoints locally.