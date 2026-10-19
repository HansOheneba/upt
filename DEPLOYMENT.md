# Celerey AI — Deployment Plan (Frontend on Vercel)

**Audience:** Hans (frontend, Next.js) and whoever operates the Celerey AI API.
**Companion docs:** [NEXTJS_INTEGRATION.md](NEXTJS_INTEGRATION.md) (code examples) ·
`celerey-api.postman_collection.json` (API playground)

**Env templates:** `celerey-api.env.example` (§2a) · `vercel.env.example` (§2b)

---

## 1. Architecture — what runs where

The Celerey AI API is a **Python/FastAPI service with a persistent ChromaDB vector store
and long-lived SSE streaming responses. It cannot run on Vercel** (Vercel functions are
short-lived and have no persistent disk). The split is:

```
┌────────────────────────┐         ┌──────────────────────────────┐
│  Vercel                │  HTTPS  │  Celerey AI API              │
│  Next.js app (Hans)    ├────────▶│  FastAPI + ChromaDB          │
│  - UI pages            │         │  Railway / Render / VPS /    │
│  - Route Handlers      │         │  Docker on your own infra    │
│    (mint JWT, proxy)   │         │  - needs persistent volume   │
└────────────────────────┘         │    for data/chromadb         │
                                   └──────────────┬───────────────┘
                                                  │ HTTPS (scrubbed of PII)
                                                  ▼
                                        External LLM (DeepSeek)
```

- **Hans deploys only the Next.js app to Vercel.**
- The Next.js app talks to the Celerey API server-side (Route Handlers), so no
  secret ever ships to the browser.
- All requests are authenticated: end-user requests with a **JWT** minted by the
  Next.js server, service jobs (profile sync) with the **X-API-Key** header.
- A JWT for user A can only access user A's data — the API enforces this
  (`403` otherwise). The service key can act on any user.

---

## 2. Environment variables

> ⚠️ **Never commit real values.** Real secrets were leaked in this repo's history
> once already — every value below must be freshly generated/rotated and live only
> in the deployment platform's env settings.

### 2a. Celerey API server (`.env` on the API host)

Copy `celerey-api.env.example` to `.env` on the host (or paste into Railway/Render env UI).

| Variable | Required | Example / how to get the value | Notes |
|---|---|---|---|
| `LLM_PROVIDER` | yes | `deepseek` | `ollama` \| `deepseek` \| `groq` \| `openai` |
| `LLM_MODEL` | yes | `deepseek-chat` | Provider-specific model name |
| `DEEPSEEK_API_KEY` | if deepseek | Create at https://platform.deepseek.com | **Rotate the old one — it leaked** |
| `API_SECRET_KEY` | **yes** | `python -c "import secrets; print(secrets.token_hex(32))"` | JWT signing secret. **Must be identical to `CELEREY_API_SECRET_KEY` on Vercel.** Auth is disabled (503) if left at a default. |
| `SERVICE_API_KEY` | **yes** | `python -c "import secrets; print(secrets.token_hex(32))"` | Service-to-service key. Auth is disabled (503) if left at the default. |
| `JWT_ALGORITHM` | no | `HS256` (default) | Leave as HS256 |
| `ALLOWED_ORIGINS` | **yes** | `https://your-app.vercel.app,https://app.celerey.com` | Comma-separated. Include every Vercel domain that calls the API (only needed if the browser ever calls the API directly; the proxy pattern below doesn't require it, but set it anyway). |
| `API_HOST` / `API_PORT` | no | `0.0.0.0` / `8000` | Bind address for uvicorn |
| `CHROMA_DB_PATH` | no | `/data/chromadb` | **Point at a persistent volume** on Railway/Render |
| `MAX_TOKENS`, `TEMPERATURE`, `RAG_TOP_K` | no | `2048`, `0.2`, `5` | Tuning, defaults are fine |

### 2b. Vercel project (Settings → Environment Variables)

Copy `vercel.env.example` into Vercel env UI or local `.env.local`.

| Variable | Required | Value | Notes |
|---|---|---|---|
| `CELEREY_API_URL` | **yes** | `https://celerey-api.yourdomain.com` | Base URL of the deployed API. No trailing slash. |
| `CELEREY_API_SECRET_KEY` | **yes** | Same value as the API's `API_SECRET_KEY` | Used to mint user JWTs **server-side only** |
| `CELEREY_SERVICE_API_KEY` | yes | Same value as the API's `SERVICE_API_KEY` | Only needed if the Next.js app performs profile syncs |
| `CELEREY_JWT_TTL_SECONDS` | no | `900` | Token lifetime; 15 min is a good default (tokens **must** have `exp` — the API rejects tokens without it) |

**Rules for Hans:**
- **No `NEXT_PUBLIC_` prefix on any of these.** They are server-side secrets; a
  `NEXT_PUBLIC_` variable is embedded in the browser bundle and public.
- Set them for *Production*, *Preview*, and *Development* environments in Vercel
  as appropriate (Preview can point at a staging API).
- Local dev: put them in `.env.local` (which is gitignored by Next.js).

---

## 3. Deployment steps

### Step 1 — Deploy the Celerey API (backend owner)

Any Docker-capable host works. Example `Dockerfile` at repo root:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "api_server.py", "--host", "0.0.0.0", "--port", "8000"]
```

1. Provision the host (Railway / Render / a VPS) **with a persistent volume**
   mounted and `CHROMA_DB_PATH` pointing into it.
2. Set every variable from table 2a. The API **fails closed**: if
   `API_SECRET_KEY` / `SERVICE_API_KEY` are missing or defaults, all auth
   returns `503`.
3. Deploy, then verify: `GET https://<api-host>/health` → `{"status":"ok"}`.
   (Details like model/provider only appear when the request is authenticated.)
4. Put the API behind HTTPS (Railway/Render do this automatically).

### Step 2 — Seed / sync user profiles

Profiles are pushed from your main backend (or Postman for testing) via
`POST /profile/sync` with the `X-API-Key` header. **Privacy note:** send
pseudonymous `user_id`s and display names only — the API de-identifies documents
and scrubs PII before anything reaches the external LLM, but the less real
identity data sent in, the better.

### Step 3 — Deploy the Next.js app to Vercel (Hans)

1. Push the Next.js repo to GitHub and import it in Vercel.
2. Add the four variables from table 2b.
3. Deploy. Vercel gives you `https://<project>.vercel.app`.
4. Tell the backend owner the final domain(s) so they are added to the API's
   `ALLOWED_ORIGINS`.
5. Smoke test in production: load the dashboard (metrics call) and ask the
   advisor one question (SSE stream).

> **Vercel + SSE:** streaming works on Vercel Route Handlers. Ensure the proxy
> route exports `export const dynamic = "force-dynamic"` (in the integration
> examples) so responses are never cached/buffered. Advisory answers can take
> 30–60s to finish streaming; Route Handlers on a Hobby plan cap execution
> around 60s — if answers get cut off, raise `maxDuration` (Pro plan) or shorten
> `MAX_TOKENS` on the API.

---

## 4. Security checklist before go-live

- [ ] `API_SECRET_KEY` and `SERVICE_API_KEY` are freshly generated (not the leaked/default values), and identical between API host and Vercel.
- [ ] Old DeepSeek key revoked; new key set only on the API host.
- [ ] No `NEXT_PUBLIC_` secrets in the Vercel project.
- [ ] `ALLOWED_ORIGINS` lists the exact production domains (no `*`).
- [ ] JWTs are minted server-side with a short `exp` (≤ 1 hour).
- [ ] `GET /health` unauthenticated shows only `{"status": ...}` (verifies you're on the hardened build).
- [ ] Rate limiting in front of `/ask` (Vercel middleware or API gateway) — each call costs LLM tokens.
