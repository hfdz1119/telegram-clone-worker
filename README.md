# Telegram Backup & Chat Worker

<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Cloudflare_D1-SQLite-blue?style=for-the-badge&logo=sqlite&logoColor=white" alt="Cloudflare D1" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <strong>Fast, serverless Telegram channel cloner, batch backfiller, and real-time live synchronization engine.</strong><br />
  Runs natively on <strong>Cloudflare Workers</strong>, <strong>Cloudflare D1 (Serverless SQLite)</strong>, and the <strong>Telegram Bot API</strong>.
</p>

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/hfdz1119/telegram-clone-worker">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" />
  </a>
</p>

---

## Overview

**Telegram Backup & Chat Worker** is a self-hosted Cloudflare Worker fork of [iamLiquidX/telegram-clone-worker](https://github.com/iamLiquidX/telegram-clone-worker), licensed under MIT. It retains the upstream task dashboard and copy engine, with safer first-run console access and an optional, explicitly invoked private-chat AI command.

The upstream backfill, live-copy, and filtering features remain available; the new-post-only live task is the recommended starting point for this project.

---

## This fork's first-use path

- Create one **New messages only (Live forward)** task per source-to-destination pair. To send one source to several backup channels, create one task for each destination; multiple tasks can share a bot.
- The console runs on Cloudflare Workers with D1. The live-only scope is the wizard default; historical backfill is an optional separate scope and is not needed for a new-post-only setup.
- With a bot that has an active live-forward task, `/chat your question` in its private chat invokes the optional OpenAI-compatible model. Ordinary messages, group messages and channel posts are not sent to the model. Each command is stateless: prior conversation turns are not retained; pausing all live tasks also pauses message polling.
- Configure `CHAT_API_KEY` as a Cloudflare Worker Secret, and set `CHAT_MODEL` plus optional `CHAT_API_BASE_URL` as Worker variables. The key is never placed in the browser or D1 by this feature.
- **Important credential limitation:** this upstream console currently stores Telegram bot tokens in D1 (and saved task templates may store a token there too); they are not encrypted at rest by this fork yet. Restrict Cloudflare account/D1 access and do not treat this as ready for sensitive production tokens until encrypted secret storage is implemented.

This repository is a fork, not a deployment of the original project. Its initial changes preserve the upstream task engine and MIT license attribution.

---

## Screenshots

<p align="center">
  <img src="docs/images/dashboard.png" alt="Telegram Clone Worker - Active Tasks Dashboard" width="100%" />
</p>
<p align="center"><em>Real-time dashboard tracking active pipelines, messages copied counter, and multi-bot metrics.</em></p>

<br />

<p align="center">
  <img src="docs/images/task_detail.png" alt="Telegram Clone Worker - Pipeline Execution & Task Specification" width="100%" />
</p>
<p align="center"><em>Granular task view showing backfill progress, live auto-sync polling status, and channel bindings.</em></p>

---

## Key Features

### 🚀 High-Throughput Backfill Engine
- **Sequential Range Backfill**: Clone full history between exact message IDs (`start_id` to `end_id`) with configurable pacing batch sizes (default: 60 messages/minute).
- **"Last N" Recent Backfill**: Fast backward-scanning discovery to clone the latest *N* messages without needing to guess channel start IDs.
- **Resilient Gap Handling**: Deleted posts or empty message IDs in Telegram channels are skipped cleanly without stalling the pipeline or throwing false failures.

### ⚡ 1-Minute Live Stream Auto-Sync
- **Cron-Driven Polling**: Automatically checks Telegram updates every minute across all active bots with multi-page update draining (up to 500 updates per tick).
- **Two-Stage Catch-Up Stream**: Buffers incoming live messages while an initial history backfill is active, and automatically drains the buffer in sequential order once the backfill finishes.

### 🔍 Granular Message & Size Filtering
- **Media Type Filtering**: Choose to copy all messages or restrict to specific media types (`document`, `video`, `photo`, `audio`).
- **File Size Thresholds**: Filter media by file size (e.g. only copy files `≥ 10 MB` or ignore files `> 500 MB`).
- **Live Filter Telemetry**: See real-time skip and match logs directly in your activity feed.

### 🛡️ Enterprise Multi-Bot Scaling & Rate Limit Protection
- **Concurrency Limiter**: Multi-bot polling strictly adheres to Cloudflare Workers' 6-connection ceiling, preventing silent socket stalls.
- **Atomic Bot Leases**: Bot-scoped locks guarantee tasks on the same bot never collide or flood Telegram with parallel batches.
- **Automatic 429 Cooldown**: Catches Telegram rate limits (`retry_after`), pauses the specific bot, and automatically resumes once the cooldown expires.
- **401 & 409 Self-Healing**:
  - Automatically detects revoked tokens (401 Unauthorized), pauses the affected task, and logs actionable alerts.
  - Automatically detects and resolves Telegram webhook conflicts (409 Conflict) by calling `deleteWebhook` on the fly.

### 🖥️ Modern Web Management Console
- Built with **React 19**, **Vite**, and tokenized CSS.
- **Zero Duplication Information Architecture**: Single unified view for Historical Backfill progress, Live Auto-Sync metrics, and Task Specifications.
- **Diagnostic Hub**: Send ad-hoc test copies directly from the console to verify bot permissions before running bulk tasks.
- **Task Templates**: Save source/destination configurations to clone new tasks in seconds.
- **Responsive Layout**: Docked bottom footer on desktop/tablet views and touch-friendly mobile drawer.
- **Fail-Safe Error Boundary**: React crashes are caught gracefully with intuitive recovery actions instead of blank screens.

### 🔐 Admin security
- New installs are locked until an admin password is configured; API management routes reject unauthenticated requests during setup. There is no passwordless skip button.
- Prefer setting a unique `ADMIN_PASSWORD` Cloudflare Worker Secret before exposing the service. First-run browser setup is available if the secret is not preset; until the first password is set, anyone who can reach the setup page could claim the initial password.
- Passwords configured in the UI are salted and hashed in D1; sessions are signed with Web Crypto. `ALLOW_OPEN_ACCESS=true` is an explicit, unsafe opt-in that disables the password gate. Do not set it for a public Worker.
- This protects the console, but it does **not** encrypt bot tokens already stored by the upstream D1 schema. See the credential limitation above.

---

## Optional private AI chat

Set these Worker settings to enable the command; keep `CHAT_API_KEY` in **Worker Secrets**, never in GitHub or browser variables:

| Setting | Type | Purpose |
| --- | --- | --- |
| `CHAT_API_KEY` | Secret | Bearer key for the model API |
| `CHAT_MODEL` | Variable | Provider's model identifier |
| `CHAT_API_BASE_URL` | Variable, optional | OpenAI-compatible API base URL; defaults to `https://api.openai.com/v1` |
| `CHAT_SYSTEM_PROMPT` | Variable, optional | System prompt; defaults to a short helpful-assistant instruction |

While a bot has an active live-forward task, it sends a model request only for `/chat ...` from a human user's private chat. It sends that command text alone, with no channel content and no prior turn history. The provider may charge separately; review its pricing and privacy terms before setting a key.

## Architecture

```mermaid
flowchart LR
    subgraph Telegram ["Telegram Infrastructure"]
        TG_API["Telegram Bot API"]
        SRC_CHAT["Source Channel"]
        DST_CHAT["Destination Channel"]
    end

    subgraph Cloudflare ["Cloudflare Workers Platform"]
        CRON["Scheduled Cron (1 min)"]
        HTTP["HTTP Fetch Handler"]
        WORKER["Telegram Clone Worker Engine"]
        D1[("Cloudflare D1 (SQLite)\n• bots\n• tasks\n• activity_log\n• pending_buffer")]
        ASSETS["Static Web Assets (React 19 SPA)"]
    end

    subgraph Client ["Browser Console"]
        UI["Web Dashboard"]
    end

    CRON -->|Trigger| WORKER
    HTTP -->|API Requests| WORKER
    WORKER <-->|Query & Mutate| D1
    WORKER <-->|getUpdates / copyMessages| TG_API
    TG_API -->|Read| SRC_CHAT
    TG_API -->|Post| DST_CHAT
    UI <-->|Manage Tasks & Telemetry| HTTP
    UI <-->|Load UI| ASSETS
```

---

## Things to Keep in Mind (Gotchas & Best Practices)

> [!IMPORTANT]
> **1. Bot Permissions in Telegram**
> - **Destination Channel**: The bot **MUST** be added as an **Administrator** with the **"Post Messages"** permission. Without this, Telegram will reject all copy attempts with `400 Bad Request: CHAT_ADMIN_REQUIRED` or `403 Forbidden`.
> - **Source Channel**: The bot must be a member of the source channel. If the source channel is private, the bot must be invited or added as an admin.

> [!WARNING]
> **2. Protected Content / Restrict Saving Content**
> - If the source channel has the **"Restrict saving content"** setting enabled in its channel settings, Telegram blocks bots from copying or forwarding messages using standard Bot API methods (`copyMessages`).
> - This is a Telegram server-side restriction enforced on all bots.

> [!NOTE]
> **3. Telegram Rate Limits & Best Practices**
> - Telegram limits bots to approximately **20 messages per minute per chat**, and **30 messages per second globally**.
> - Telegram Clone Worker paces batch copying to ~60 messages/minute in bulk mode. If Telegram returns an HTTP 429 rate limit, the worker automatically pauses that bot for the exact `retry_after` duration returned by Telegram.
> - **💡 Best Practice (1 Bot per Backfill Task)**: Telegram rate limits apply per bot token. Running multiple historical backfills concurrently on the same bot token quickly triggers severe `429 Flood Wait` cooldowns (often pausing the bot for 5 to 30+ minutes). For large channel backfills, always create a separate bot token in `@BotFather` for each backfilling task to achieve uninterrupted full copy speed.

> [!TIP]
> **4. Bot Token Security**
> - This fork currently inherits upstream storage behavior: bot tokens (including tokens in saved templates) are stored in D1 without application-level encryption. Treat access to the Worker and D1 database as sensitive.
> - Never commit bot tokens into Git or publish D1 database dumps. Encrypted-at-rest token storage is not implemented yet.

> [!NOTE]
> **5. Cloudflare Free Tier Boundaries & D1 Resource Usage (50 Bots / Day)**
> - **Cloudflare Workers Free Plan**: Includes 100,000 requests/day and 10ms CPU time per request (Worker cron uses only 1,440 invocations/day = 1.4%).
> - **Cloudflare D1 Free Plan**: Includes **5,000,000 read rows/day** and **100,000 write rows/day**.
> - **50 Bots Read Consumption**: At 1-minute cron intervals (1,440 ticks/day), listing active tasks (~50 rows) and fetching bot secrets (50 point-lookups) consumes ~100 rows per tick = **~144,000 reads/day** (uses only **2.88%** of your 5M free daily read limit).
> - **50 Bots Write Consumption**:
>   - **Live Auto-Sync**: Consumes 0 writes when chats are idle; ~3 to 4 writes per delivered message (e.g. 2,000 messages/day across 50 channels = **~7,000 writes/day**, or **7%** of the free write limit).
>   - **Active Historical Backfill**: Each active backfilling bot consumes ~4 writes per 60-message batch (~5,830 writes/day). On the **100% Free Plan**, you can run up to **15 bots backfilling simultaneously 24/7** (~1.3M messages/day). If all 50 bots backfill 24/7 (~4.3M messages/day), D1 writes reach ~291k/day, costing only ~$0.19/day on the Cloudflare Workers Paid plan.

---

## 1-Click Deployment (Recommended)

Deploy this fork only after reviewing its security limitations; this repository is not yet configured with your channels or model service:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hfdz1119/telegram-clone-worker)

### How It Works:
1. Click the **Deploy with Workers** button above.
2. Sign in to your Cloudflare account and authorize GitHub.
3. Cloudflare will automatically:
   - Fork/clone this repository to your account.
   - Provision a new **Cloudflare D1 database** (`telegram-clone-worker-db`).
   - Deploy the Worker and static assets.
4. **Activate Your Worker URL (One-time, 1-Click in Cloudflare Dashboard)**:
   - When Cloudflare creates a new Worker from a connected Git repository, it allocates your unique subdomain (`telegram-clone-worker.<your-subdomain>.workers.dev`) with the route initially set to *Disabled* by default for safety.
   - To activate your public URL:
     1. In your Cloudflare Dashboard, open **Workers & Pages** and click **`telegram-clone-worker`**.
     2. Click the **Domains** tab in the top navigation bar (or click **Domains and routes →** on the right sidebar).
     3. Under the **workers.dev** section, click **Enable**.
     4. Your Worker URL is now live (`https://telegram-clone-worker.<your-subdomain>.workers.dev`).
      5. This is a **one-time step** — all future code pushes and updates will remain permanently live at this URL!
    - *(Optional)* You can also click **Add custom domain** in the same **Domains** tab to serve the application on your own branded domain (e.g. `clone.yourdomain.com`).
5. **Zero-Config Database Initialization**:
   - The worker features an automatic bootstrap engine ([`src/db/bootstrap.ts`](src/db/bootstrap.ts)).
   - When you visit your deployed worker URL for the first time, all tables and indexes are created automatically. You do **not** need to run any manual terminal migration commands!
6. **Configuring Admin Password (Required unless intentionally open)**:
   - **Before exposing the Worker**: Go to **Workers & Pages > telegram-clone-worker > Settings > Variables and Secrets**, and add a unique secret named `ADMIN_PASSWORD` (at least 12 characters). The console requires it for admin access.
   - **Via CLI**: Run `npx wrangler secret put ADMIN_PASSWORD` in your terminal before enabling the public Worker URL.
   - **Via Browser**: If you do not preset `ADMIN_PASSWORD`, the first visit requires setting a password of at least 12 characters. The setup endpoint is reachable before this first password is set, so preset the secret before exposing the Worker to avoid an initial-setup race.

---

## Updating Your Deployment

To update your fork, push changes to its `main` branch. To deliberately pull upstream changes, review them before merging:

```bash
git add -A
git commit -m "Describe your change"
git push origin main
```

When Cloudflare Workers Builds is connected to this fork, a push to `main` triggers its configured build and deployment. No Cloudflare project has been connected or deployed by this repository change.

---

## Manual CLI Setup & Local Development

If you prefer to run or customize the project locally:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

### 2. Clone & Install
```bash
git clone https://github.com/hfdz1119/telegram-clone-worker.git
cd telegram-clone-worker
npm install
```

### 3. Create Cloudflare D1 Database
```bash
npx wrangler d1 create telegram-clone-worker-db
```
Copy the `database_id` from Wrangler's output and update it in [`wrangler.jsonc`](wrangler.jsonc):
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "telegram-clone-worker-db",
    "database_id": "your-database-uuid-here"
  }
]
```

### 4. Apply Schema Migrations
```bash
# For local development
npm run db:migrate:local

# For remote Cloudflare database
npm run db:migrate:remote
```

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build & Deploy
```bash
npm run deploy
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start local Vite development server with mock API support. |
| `npm run build` | Build SSR worker bundle and client production assets via Vite. |
| `npm run typecheck` | Run full project reference TypeScript checks (`tsc -b`). |
| `npm run deploy` | Build and deploy Worker + assets to Cloudflare (`vite build && wrangler deploy`). |
| `npm run db:migrate:local` | Apply database migrations to local D1 SQLite. |
| `npm run db:migrate:remote` | Apply database migrations to remote Cloudflare D1. |

---

## API & RPC Endpoints

All API endpoints run under the `/api` route:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bots` | List all connected bots and their task workloads. |
| `POST` | `/api/bots/verify` | Validate a bot token against Telegram's `getMe`. |
| `DELETE` | `/api/bots/:id` | Disconnect a bot and cascade-remove its tasks. |
| `GET` | `/api/tasks` | List all active, paused, and completed tasks. |
| `POST` | `/api/bots/:botId/tasks` | Create a new backfill or live forwarding task. |
| `GET` | `/api/tasks/:id` | Fetch task details, filter rules, and progress. |
| `PATCH` | `/api/tasks/:id` | Update task label, scope, cursor, or pause/resume status. |
| `DELETE` | `/api/tasks/:id` | Delete a task and its activity history. |
| `GET` | `/api/tasks/:id/activity` | Stream recent activity logs and filter events. |
| `POST` | `/api/bots/:botId/tasks/:taskId/test-copy` | Dispatch an ad-hoc test message copy. |
| `GET` | `/api/saved-tasks` | List saved task templates. |
| `POST` | `/api/saved-tasks` | Save a new task template. |
| `GET` | `/api/health` | Service health check. |

---

## License & Credits

- **Author**: [iamLiquidX](https://github.com/iamLiquidX)
- **Support Chat**: [Telegram Community](https://t.me/liquidxprojects)
- **This fork**: [hfdz1119/telegram-clone-worker](https://github.com/hfdz1119/telegram-clone-worker)
- **Upstream**: [iamLiquidX/telegram-clone-worker](https://github.com/iamLiquidX/telegram-clone-worker)
- **License**: [MIT](LICENSE)
