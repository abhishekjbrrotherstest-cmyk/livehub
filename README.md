# LiveHub — Real-Time Live Streaming & Group Voice Chat Backend

A production-style backend for a live streaming & group voice chat platform built with **Node.js + TypeScript**, featuring REST APIs, **Socket.IO** real-time events, **MongoDB** persistence, **Redis** presence/state/pub-sub, and **LiveKit** audio/video integration.

> **Assignment:** LVS Innovation Pvt Ltd — Backend Developer Technical Assignment
> **Approximate time spent:** 8 hours

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technologies Used](#technologies-used)
4. [Project Structure](#project-structure)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [API Documentation](#api-documentation)
8. [Socket.IO Events](#socketio-events)
9. [Redis Implementation](#redis-implementation)
10. [LiveKit Integration](#livekit-integration)
11. [Docker Instructions](#docker-instructions)
12. [CI/CD Details](#cicd-details)
13. [Deployment Instructions](#deployment-instructions)
14. [Scalability Approach (100 → 10,000+ users)](#scalability-approach)
15. [Screen Recording Checklist](#screen-recording-checklist)
16. [Known Limitations](#known-limitations)

---

## Project Overview

| Feature | Status |
|---|---|
| User Registration / Login / JWT Auth / Get Me | ✅ |
| Secure password hashing (bcrypt) + auth middleware | ✅ |
| Room CRUD: create / join / leave / details / list active | ✅ |
| Real-time events via Socket.IO (presence, room lifecycle, messages) | ✅ |
| Redis: online presence (ZSET), room participant state (SET), Socket.IO pub/sub adapter | ✅ |
| MongoDB: Users, Rooms, Participation history with indexes & validation | ✅ |
| LiveKit access-token generation with host/participant permission grants | ✅ |
| LiveKit webhook receiver with signature verification (bonus) | ✅ |
| Dockerfile (multi-stage dev/prod) + docker-compose (API + Mongo + Redis) | ✅ |
| GitHub Actions CI/CD: install → lint → build → test → docker build/publish | ✅ |
| Nginx reverse proxy config with WebSocket support (bonus) | ✅ |

---

## Architecture

```
                       ┌─────────────────────────────┐
   Client (web/mobile) │  REST  /api/v1/*            │
        ┌──────────────►        /socket.io           ◄──────────────┐
        │              └──────────────┬──────────────┘              │
        │                             │                             │
        │                    ┌────────▼─────────┐                   │
        │                    │  Nginx (prod)    │ SSL + WS upgrade  │
        │                    └────────┬─────────┘                   │
        │                             │                             │
┌───────┴─────────────────────────────▼──────────────────────────┐──┴──────┐
│                     Node.js Backend (Express + Socket.IO)       │         │
│                                                                 │         │
│  Routes ─► Controllers ─► Services ─► Mongoose Models           │         │
│      ▲                        │                                 │         │
│      │                        ├────────────► Redis (ioredis)     │         │
│  Auth Middleware               │         - presence ZSET          │         │
│  Validation (zod)              │         - room participant SETs  │         │
│  Rate limiting                 │         - conn-count keys        │         │
│                                │                                  │         │
│  Socket layer ◄── Typed EventBus ── LiveKit WebhookReceiver       │         │
│  (rooms, presence)             │                                  │         │
│                                │                                  │         │
│  @socket.io/redis-adapter ◄────┘  (cross-node broadcast via      │         │
│                                    Redis pub/sub)                │         │
└──────────────┬──────────────────────────────┬───────────────────────────┘
               │                              │
        ┌──────▼──────┐               ┌───────▼───────┐        ┌──────────────┐
        │   MongoDB   │               │     Redis     │        │  LiveKit SFU │
        │ users,rooms │               │ presence/state│        │  (voice/video│
        │ participations               │ pub/sub       │        │   media)     │
        └─────────────┘               └───────────────┘        └──────────────┘
```

**Key design decisions**

- **Layered structure**: routes → controllers → services → models. Business logic lives in *services* so both REST and the socket layer share one code path (e.g., `joinRoom` is used by `POST /rooms/:id/join` **and** the `room:join` socket event).
- **Typed event bus**: domain changes (participant joined/left, status changed) are published once; the socket layer subscribes and broadcasts. This guarantees identical behaviour whether an action came from REST, a socket, or a LiveKit webhook.
- **Single source of truth**: MongoDB persists membership; Redis holds *live* ephemeral state. `GET /rooms/:id` returns both (`participants.length` persisted vs `liveParticipantCount` from Redis).

---

## Technologies Used

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+, TypeScript 5 (strict mode) |
| HTTP framework | Express 4 |
| Real-time | Socket.IO 4 + `@socket.io/redis-adapter` |
| Database | MongoDB 7 + Mongoose 8 |
| Cache/Pub-sub | Redis 7 + ioredis |
| RTC media | LiveKit Server SDK v2 (tokens + webhooks) |
| Validation | Zod |
| Security | helmet, cors, express-rate-limit, bcryptjs, JWT (jsonwebtoken) |
| Logging | Custom zero-dependency logger + morgan (HTTP access log) |
| Testing | Vitest (unit tests) |
| Dev tooling | ts-node-dev, ESLint 9 (typescript-eslint flat config), tsc |
| Infra | Docker (multi-stage), docker-compose, Nginx, GitHub Actions |

---

## Project Structure

```
livehub-backend/
├── src/
│   ├── app.ts                  # Express app assembly (middleware, routes, errors)
│   ├── server.ts               # Bootstrap: DB, Redis, HTTP + Socket.IO, graceful shutdown
│   ├── config/
│   │   ├── env.ts              # Zod-validated environment configuration
│   │   ├── db.ts               # Mongo connection with retry
│   │   └── redis.ts            # ioredis clients (main + subscriber for adapter)
│   ├── controllers/            # Thin HTTP handlers
│   ├── middlewares/
│   │   ├── auth.middleware.ts          # JWT verification
│   │   ├── validation.middleware.ts    # Zod validate() helper
│   │   ├── rateLimit.middleware.ts     # Global + auth rate limits
│   │   └── error.middleware.ts         # Centralised error mapping
│   ├── models/                 # Mongoose schemas: User, Room, Participation
│   ├── routes/                 # Express routers mounted under /api/v1
│   ├── services/               # auth, room, presence (Redis), livekit
│   ├── sockets/socket.server.ts# Socket.IO auth, room handlers, presence, broadcasts
│   ├── validators/             # Zod schemas per resource
│   ├── events/eventBus.ts      # Typed in-process pub/sub
│   ├── types/                  # Shared TS interfaces + Express augmentation
│   └── utils/                  # ApiError, ApiResponse, jwt, asyncHandler, logger, cors
├── tests/unit/                 # Vitest unit tests (no external services needed)
├── client/                     # React frontend (Vite + TS + Tailwind + Redux Toolkit + LiveKit)
│   ├── src/store/              # authSlice, roomsSlice, uiSlice (Redux Toolkit)
│   ├── src/hooks/useAppSocket  # socket.io → Redux bridge
│   ├── src/components/room/    # VoicePanel (LiveKit), ChatPanel, ParticipantsList
│   └── src/pages/              # Login, Register, Rooms, Room screens
├── deploy/nginx.conf           # Reverse-proxy with WebSocket upgrade support
├── .github/workflows/ci.yml    # CI/CD pipeline
├── postman_collection.json     # Importable Postman collection
├── Dockerfile                  # dev / build / prod stages
├── docker-compose.yml          # Development stack (API + Mongo + Redis)
└── docker-compose.prod.yml     # Production stack (API + Mongo + Redis + Nginx)

`tools/` (gitignored) holds portable MongoDB/Redis runners + `start-infra.cmd` / `stop-infra.cmd` for local no-Docker development on Windows.
```

---

## Setup Instructions

### Option A — Local, no Docker (Windows)

Portable MongoDB and Redis runners live in `tools/` (gitignored — see *Regenerating tools/* below):

```cmd
tools\start-infra.cmd    :: boots mongod :27017 + redis :6379 as background processes
tools\stop-infra.cmd     :: stops both
```

Then run the API and the UI in two terminals:

```bash
npm install
npm run dev              # backend  → http://localhost:5000

cd client
npm install
npm run dev              # frontend → http://localhost:5173
```

No `.env` needed for local dev — defaults already point at `127.0.0.1:27017` / `:6379`.

*Regenerating tools/:* the folder bundles `mongodb-windows-x86_64` (zip from fastdl.mongodb.org) and `Redis-x64-5.0.14.1` (zip from github.com/tporadowski/redis/releases). If missing, download both zips, extract under `tools/`, and adjust paths inside `start-infra.cmd`. On Linux/macOS just install `mongod` + `redis-server` natively instead.

### Option B — Docker Compose

```bash
cp .env.example .env          # adjust if needed (defaults work locally)
docker compose up --build     # starts api + mongodb + redis
```

API runs at `http://localhost:5000`, hot-reload enabled (source is volume-mounted).

### Option C — Local development with system services

Prerequisites: Node.js ≥ 20, MongoDB ≥ 6, Redis ≥ 6 installed as system services.

```bash
npm install
npm run dev        # http://localhost:5000 (auto-reload)
```

Useful commands:

```bash
npm run lint       # ESLint
npm run build      # tsc → dist/
npm start          # run compiled dist/server.js
npm test           # vitest unit tests
```

### Quick smoke test

```bash
curl http://localhost:5000/health
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Abhishek","email":"abhishek@example.com","password":"secret123"}'
```

### Option C — Run the React frontend (client/)

```bash
cd client
cp .env.example .env
npm install
npm run dev        # http://localhost:5173 (backend must be running on :5000)
```

Full-stack demo flow:

```bash
docker compose up -d mongo redis     # infra
npm run dev                          # backend  → http://localhost:5000
cd client && npm run dev             # frontend → http://localhost:5173
```

The UI covers registration/login, room browsing & creation, realtime member/chat/presence events, and one-click LiveKit voice connection (mic publish + remote playback + speaking rings). See `client/README.md` for details.

---

## Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `5000` | HTTP port |
| `CORS_ORIGIN` | `*` | Comma-separated allow-list, or `*` |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/livehub` | MongoDB connection string |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection string |
| `JWT_SECRET` | dev-only fallback (**blocked in production**) | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `LIVEKIT_API_KEY` | `devkey` | LiveKit API key |
| `LIVEKIT_API_SECRET` | dev-only fallback | LiveKit API secret |
| `LIVEKIT_SERVER_URL` | `ws://localhost:7880` | URL returned to clients for connecting |
| `LOG_LEVEL` | `info` | `debug` \| `http` \| `info` \| `warn` \| `error` |

In `NODE_ENV=production` the app refuses to start if `JWT_SECRET` still equals the development default.

---

## API Documentation

Base URL: `/api/v1`. All protected endpoints require `Authorization: Bearer <token>`.

All responses follow a consistent envelope:

```json
{ "success": true, "message": "...", "data": { }, "meta": { } }
```

Errors:

```json
{ "success": false, "message": "Validation failed", "details": [{ "path": "email", "message": "Invalid email format" }] }
```

| Method | Endpoint | Auth | Description | Codes |
|---|---|---|---|---|
| GET | `/health` | – | Health check | 200 |
| POST | `/auth/register` | – | Register user | 201, 409, 422 |
| POST | `/auth/login` | – | Login, returns JWT | 200, 401 |
| GET | `/users/me` | ✅ | Current user profile | 200, 401 |
| POST | `/rooms` | ✅ | Create room (creator becomes host) | 201 |
| GET | `/rooms` | ✅ | List rooms (`?page&limit&status&search`) | 200 |
| GET | `/rooms/:id` | ✅ | Room details incl. participants & live count | 200, 404 |
| POST | `/rooms/:id/join` | ✅ | Join room (idempotent) | 200, 404, 409 |
| POST | `/rooms/:id/leave` | ✅ | Leave room (host leaving ends the room) | 200, 404 |
| GET | `/rooms/:id/messages` | ✅ | Chat history (`?page&limit`, oldest→newest) | 200, 404 |
| POST | `/rooms/:id/messages` | ✅ | Send a chat message (also persisted by socket path) | 201, 404, 422 |
| POST | `/livekit/token` | ✅ | Generate LiveKit join token | 200, 422 |
| POST | `/livekit/webhook` | Signature | LiveKit webhook receiver | 200, 401 |

### Examples

**POST `/auth/register`**
```json
// Request
{ "name": "Abhishek", "email": "user@example.com", "password": "secret123", "profileImage": null }

// Response 201
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "_id": "66a...", "name": "Abhishek", "email": "user@example.com", "isOnline": false },
    "token": "eyJhbGciOi..."
  }
}
```

**POST `/livekit/token`**
```json
// Request  (identity is taken from the authenticated user, not the body — prevents token spoofing)
{ "roomName": "room123", "role": "participant" }

// Response 200
{
  "success": true,
  "data": {
    "token": "<LIVEKIT_TOKEN>",
    "serverUrl": "wss://your-livekit-host:7880",
    "roomName": "room123",
    "identity": "66a...",
    "role": "participant",
    "expiresInSeconds": 21600
  }
}
```

**Security measures applied**: helmet headers, CORS allow-list, rate limiting (50/15min on auth, 300/min global), zod input validation with `.strict()` (unknown fields rejected), bcrypt hashing (cost 10), JWT payload verified against DB user existence, generic login error messages, no secrets in responses/logs, 4xx-vs-5xx separation with centralised error handler.

---

## Socket.IO Events

Connect with a JWT either as `io(url, { auth: { token } })` or an `Authorization: Bearer <token>` header. Unauthenticated connections are rejected during handshake.

### Client → Server

| Event | Payload | Ack | Notes |
|---|---|---|---|
| `room:join` | `{ roomId }` | ✅ `{ success, message, data: { roomId, participantCount } }` | Persists membership + joins socket channel |
| `room:leave` | `{ roomId }` | ✅ `{ success, message, data: { roomId, ended } }` | Host leaving ends the room |
| `room:message` | `{ roomId, message }` | – | Persisted to Mongo, then broadcast to that room (≤1000 chars, members only) |
| `presence:heartbeat` | – | – | Refreshes Redis presence TTL window |

### Server → Client

| Event | Payload | Triggered when |
|---|---|---|
| `presence:online` | `{ userId, name, at }` | Any user's first connection |
| `presence:offline` | `{ userId, name, at }` | Last socket of a user disconnects |
| `room:participant-joined` | `{ roomId, user: {userId, name}, source: 'app'\|'livekit', at }` | Someone joins (REST, socket, or LiveKit webhook) |
| `room:participant-left` | `{ roomId, user: {userId, name}, source, at }` | Someone leaves |
| `room:participant-count` | `{ roomId, participantCount, at }` | Count changes |
| `room:status-updated` | `{ roomId, status: 'active'\|'ended', at }` | Room ends (host left or LiveKit `room_finished`) |
| `room:message` | `{ id, roomId, from: {userId, name}, message, at }` | Chat message in room (`id` = Mongo id, used for history dedupe) |

### Behaviour notes

- Events are scoped: room events go only to sockets in `room:<id>` channels; presence goes globally.
- On reconnect, sockets automatically rejoin channels of rooms where they have an open participation record.
- Multi-tab/multi-device: online/offline flips only when the *first* connection opens / *last* closes (connection counter in Redis).
- Crashed-server zombies are reaped: heartbeat scores older than 90 s in the presence ZSET are removed and `presence:offline` is emitted.
- Scaling: the Redis adapter lets `io.to(room).emit(...)` fan out across multiple backend instances transparently.

---

## Redis Implementation

Three meaningful use cases:

1. **Online presence — sorted set `presence:online`**
   - `ZADD presence:online <nowMs> <userId>` on connect and every heartbeat.
   - Online = member exists with score within last 90 s.
   - Stale entries (`ZREMRANGEBYSCORE`) reap crashed servers; O(log n) ops, no `KEYS`.
   - Per-user connection counter key `conn:<userId>` (INCR/DECR) decides true offline.

2. **Live room participant state — set `room:<roomId>:participants`**
   - `SADD/SREM/SCARD` give atomic, race-free join/leave/count semantics that REST and sockets both read/write; cleared when a room ends (with TTL safety net).

3. **Socket.IO scaling — `@socket.io/redis-adapter`**
   - All `io.*.emit` calls flow through Redis pub/sub, so any instance can reach sockets connected to any other instance. This makes horizontal scaling of the real-time layer possible out of the box.

### Why Redis and not just MongoDB?

MongoDB alone was insufficient for this workload because:

- **Presence is high-frequency, short-lived data.** Heartbeats every ~30 s × thousands of users would hammer Mongo with writes to documents that expire within seconds anyway. Redis does this entirely in memory (~0.1 ms) and natively supports expiry semantics (score windows / TTLs).
- **Atomic counters and sets with TTL.** Join/leave races across concurrent requests/sockets need `SADD`/`SCARD`/`INCR` single-command atomicity plus automatic key expiry — Mongo would need extra fields, TTL indexes (min 60 s granularity), and retry logic.
- **Pub/Sub for multi-instance fan-out.** Broadcasting "participant joined" to sockets spread across N backend nodes requires a message bus; Redis pub/sub provides it (used by the Socket.IO adapter).
- **Right tool per concern:** Mongo = durable relational-ish records (users, rooms, history); Redis = volatile, fast, shared runtime state.

A concrete example visible in the code: `GET /rooms/:id` returns `participantCount` (persisted truth in Mongo) alongside `liveParticipantCount` (instantaneous Redis view).

---

## LiveKit Integration

- **Token generation** (`POST /livekit/token`) uses `AccessToken` from `livekit-server-sdk`:
  - `identity` = authenticated user id; `name`, `metadata` ({ role }) embedded.
  - Common grants: `roomJoin`, `room`, `canPublish`, `canSubscribe`, `canPublishData`; tokens valid 6 h.
  - **Host** additionally receives `roomCreate` + `roomAdmin` (can mute/remove others); **participant** gets standard publish/subscribe only — enforcing host/participant permissions at the RTC layer.
  - The client then connects with any LiveKit SDK: `Room.connect(serverUrl, token)`.
- **Webhooks** (`POST /livekit/webhook`, bonus):
  - Raw request body verified with `WebhookReceiver` against the `Authorization` header signature — invalid signatures get 401.
  - `room_finished` → marks the matching Mongo room ended, clears Redis state, broadcasts `room:status-updated`.
  - `participant_joined` / `participant_left` → relayed to room channels as `source: 'livekit'` events.
- Configure your LiveKit server with `webhook_api_key`/`webhook_urls` pointing at this endpoint.

For local testing you can run a LiveKit server via its official Docker image (`livekit/livekit-server`) and point `LIVEKIT_*` env vars at it; the generated tokens are usable with any LiveKit client (e.g., https://example.livekit.cloud playground with a self-hosted server, or meet.livekit.io self-host).

---

## Docker Instructions

Multi-stage `Dockerfile`:

- `dev` target: full deps + hot reload (used by docker-compose).
- `build` target: compiles TS, prunes dev dependencies.
- `prod` target: minimal runtime image, non-root `node` user, container healthcheck on `/health`.

```bash
docker compose up --build                 # dev: api + mongo + redis (hot reload)
docker compose up mongo redis             # only infra, run `npm run dev` on host

docker build --target prod -t livehub-api .
docker compose -f docker-compose.prod.yml up -d   # prod stack incl. nginx
```

Data persists in named volumes `mongo-data` and `redis-data`.

---

## CI/CD Details

GitHub Actions workflow: `.github/workflows/ci.yml`.

Pipeline on push/PR to `main`:

1. **Install** — `npm ci`
2. **Lint** — `eslint` (flat config, typescript-eslint)
3. **Build** — `tsc` strict compilation
4. **Test** — `vitest` unit tests
5. **Docker image** — Buildx build (with GHA layer cache); on pushes to `main` the image is also published to GHCR (`ghcr.io/<repo>:sha`, `:latest`) as deployment preparation.

---

## Deployment Instructions

Tested target: Ubuntu 22.04 LTS.

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Deploy:

```bash
git clone https://github.com/<you>/livehub-backend.git && cd livehub-backend
cp .env.example .env.production    # set strong JWT_SECRET, LIVEKIT_*, NODE_ENV=production, CORS_ORIGIN
docker compose -f docker-compose.prod.yml up -d --build
curl http://localhost/health
```

Nginx (bundled at `deploy/nginx.conf`) proxies `:80` → `api:5000` with WebSocket upgrade headers and long read timeouts for realtime traffic.

SSL/HTTPS with certbot:

```bash
sudo apt install -y certbot
certbot certonly --standalone -d api.yourdomain.com
# mount certs into ./deploy/certs and add a 443 server block:
# ssl_certificate /etc/nginx/certs/fullchain.pem;
# ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

Operations:

- Logs: `docker compose -f docker-compose.prod.yml logs -f api` (json-file driver rotated 10 MB ×5) — morgan combined access logs + structured app logs with ISO timestamps and levels.
- Monitoring: `/health` endpoint for uptime checks (e.g., UptimeRobot/cron probe), `docker stats`, healthchecks defined in compose for all services.
- Updates: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.

---

## Scalability Approach

**From ~100 to 10,000+ concurrent users:**

- **Backend (stateless API):**
  - All instances are already stateless (JWT auth, shared Mongo/Redis), so scale horizontally behind a load balancer. Node stays responsive because heavy media never passes through it — LiveKit SFU carries audio/video.
  - Move long-lived concerns off the request path (queue emails/notifications), add response caching for hot reads (active-room list can be cached in Redis with a 2–5 s TTL).

- **WebSocket / Socket.IO:**
  - Run multiple Socket.IO nodes with `@socket.io/redis-adapter` (already integrated) — cross-instance emits work over Redis pub/sub. Sticky sessions at LB level (or WebSocket-aware LB like AWS ALB/NLB) since WS connections are long-lived.
  - Shard event fan-out: very large rooms switch from per-participant events to periodic count snapshots to reduce emit storms.

- **Redis:**
  - Single node becomes the bottleneck/CPOF first → deploy Redis Sentinel or Redis Cluster. Partition keys by room hash; move pub/sub traffic to dedicated nodes; enable AOF everysec persistence for warm recovery (presence can even stay ephemeral).

- **MongoDB:**
  - Replica set (PSR) for HA, then shard `participations` (huge append-only collection) on `{room}` hashed key; keep working-set indexes in RAM (`status+createdAt` for room lists, `{user,leftAt}` for open participations). Archive ended rooms/history to cold storage. Use read preference `secondaryPreferred` for analytics reads.

- **LiveKit:**
  - Media scales separately: deploy LiveKit Cloud or self-hosted SFU clusters with regional distribution and automatic room/node assignment (LiveKit handles spreading rooms across SFUs). Tokens already carry per-role grants so policy survives scale-out unchanged. TURN over TLS/443 for restrictive networks.

- **Load balancing:**
  - L4 (NLB) for WebSocket affinity + L7 (nginx/ALB) for HTTP; health-check `/health`; rate-limit at edge. Blue-green deploys: backend drains gracefully (SIGTERM handling implemented) before termination.

- **Infrastructure:**
  - Container orchestration (ECS/Kubernetes) with HPA on CPU/connection count; separate ASGs for API vs socket nodes; multi-AZ Mongo/Redis; CDN for static client assets; observability via Prometheus/Grafana (metrics endpoint) and centralized logs (Loki/CloudWatch).

---

## Screen Recording Checklist (5–10 min demo guide)

1. `docker compose up` → show containers healthy.
2. Import `postman_collection.json` → Register → Login (token auto-saved) → `users/me`.
3. Create Room → List Rooms → Get Details → Join → Leave (show host-leaves-ends-room too).
4. Open two terminals running `node scripts/socket-demo.js` style client or wscat/socket.io CLI → show `presence:online`, `room:participant-joined`, `room:participant-count` firing live.
5. `redis-cli` → `ZRANGE presence:online 0 -1 WITHSCORES`, `SMEMBERS room:<id>:participants`, `SCARD ...`.
6. `POST /livekit/token` (host & participant roles) → paste token into a LiveKit sample client → connect two peers → voice chat works.
7. Show `Dockerfile` stages, `.github/workflows/ci.yml` green run, README scalability section.

---

## Known Limitations

- **Room chat messages are not persisted** (broadcast-only) — a Message collection would be the natural next step.
- Access tokens only (7-day JWT); refresh-token rotation not implemented.
- Host leaving ends the room (documented product decision); host reassignment not implemented.
- Unit tests cover pure logic (validators, JWT, errors); full integration tests require running Mongo/Redis and are left to manual/API-collection testing to keep CI dependency-free.
- LiveKit webhook route trusts the configured API secret pair only; replay protection beyond the SDK's clock-tolerance check is not added.
- Single-region design; global latency optimization (regional SFUs, GeoDNS) described in the scalability section but not implemented.
- Profile image is stored as a URL string; binary upload/storage (S3) out of scope.

---

## Submission

- **Repository:** this repository root contains everything (source, infra, docs, API collection).
- **Time spent:** approximately 8 hours of actual working time.
- **Demo:** see [Screen Recording Checklist](#screen-recording-checklist).


:: 1. one-time / whenever rebooted
tools\start-infra.cmd

:: 2. backend
npm run dev              → http://localhost:5000

:: 3. frontend
cd client && npm run dev → http://localhost:5173