# PathProof — AP EAPCET college recommendation auditor

Upload a counselor's shortlist. PathProof checks every claim (fee, accreditation, closing
ranks, guarantees) against official records, audits the choice set, and builds an independent
five-option shortlist. Every fact keeps its source and date.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind v4 · Postgres · pg · pdf-parse
Claim extraction works without an LLM (deterministic parser); connect any OpenAI-compatible
API key to enable free-text extraction.

## Setup

```bash
# 1. Database — pick ONE:
# A) Docker (recommended, same on Windows/WSL/Linux):
docker compose up -d db
# B) Local Postgres:
# sudo service postgresql start
# sudo -u postgres psql -c "CREATE USER pathproof WITH PASSWORD 'pathproof_dev' CREATEDB;"
# sudo -u postgres createdb pathproof -O pathproof
# sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO pathproof;"

# 2. Schema + deterministic dev seed (274 colleges, ~48k cutoffs, 579 accreditations)
# Reads DATABASE_URL (.env.local), falls back to the local default.
npm run db:seed

# 3. App
cp .env.example .env.local   # set DATABASE_URL; optionally LLM_API_KEY
npm install
npm run build && npm start   # http://localhost:3000
# Health: GET /api/health -> { ok:true, db:"up" }
```

## Routes

- `/` landing (flow, sample audit, what we check, FAQ)
- `/start` → `/upload` → `/report` the audit flow (report falls back to a built-in demo)
- `/colleges` + `/colleges/[code]` verified database (fees, cutoffs by category/gender/area, accreditation validity)
- `/methodology` ranking rules + incentive firewall · `/data` live source table · legal pages

## API

- `GET /api/health` → `{ ok, db: "up"|"down", data_version }` (503 when Postgres unreachable)
- `POST /api/audit` `{ profile, counselorText }` or `{ demo: true }` → full audit report
- `POST /api/extract-pdf` multipart file → extracted text

## Guarantees encoded in code

- Hard filters are never compensated by ranking scores
- Fixed value ranges (no candidate-set normalization)
- Missing data adds an uncertainty penalty; never silently filled
- Every shortlist run is persisted (`recommendation_runs`) for replay/audit
- The LLM only extracts and explains; the deterministic engine ranks

## Data caveats (by design, not hidden)

- Absence of a record means NOT VERIFIED, never "not accredited"
- 2024 cutoffs and the 2026-27 fee block are not yet ingested
- NAAC grades are the last published list (21-08-2023)
