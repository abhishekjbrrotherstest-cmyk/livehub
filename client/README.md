# LiveHub Client — React + Redux Toolkit + Tailwind CSS

Web UI for the LiveHub real-time voice chat platform. Talks to the Express/Socket.IO backend and connects audio directly to LiveKit SFUs.

## Stack

| Concern | Library |
|---|---|
| Build tool | Vite 5 |
| UI | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3 (custom dark "native" design, zero component libraries) |
| State | Redux Toolkit (`authSlice`, `roomsSlice`, `uiSlice`) |
| REST | thin `fetch` wrapper (`src/lib/api.ts`) with auto Bearer token |
| Realtime | socket.io-client wired into Redux via `useAppSocket()` hook |
| Voice/video | livekit-client (mic publish, remote playback, speaking indicators) |
| Routing | react-router-dom v6 |

## Run it

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Make sure the backend stack is running first:

```bash
docker compose up -d mongo redis   # from repo root
npm run dev                        # backend, from repo root
```

Register an account in the UI (or reuse one created via Postman) → you land on **Live Rooms**.

## What you can do in the UI

1. **Register / Login** — JWT stored in `localStorage`; session restored on refresh via `GET /users/me`.
2. **Rooms list** — live cards with search, pagination, participant counts updating in real time.
3. **Create room** — modal → you are redirected inside as host.
4. **Room screen**
   - **Voice panel** — tap mic → fetches `/livekit/token` → connects straight to LiveKit. Mute toggle, leave voice, green ring around whoever is speaking.
   - **Members list** — host badge, online dots from presence events.
   - **Chat** — realtime messages + system messages ("X joined/left"), scoped to the room channel.

## How state flows

```
component ──dispatch(thunk)──► RTK Query-less fetch wrapper ──► REST API
    ▲                                │
    └── useSelector ◄── store ◄──────┘
              ▲
socket.io events ──► useAppSocket() ──► dispatch(action) ──┘
livekit media ──► browser ⇄ SFU directly (never touches Express)
```

Key files to read first: `src/store/authSlice.ts` → `src/hooks/useAppSocket.ts` → `src/pages/RoomPage.tsx` → `src/components/room/VoicePanel.tsx`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api/v1` | REST base URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.IO origin |

In production behind nginx both default to `window.location.origin`, so no config needed when API and UI share a domain.

## Scripts

```bash
npm run dev         # dev server with HMR
npm run build       # typecheck (tsc --noEmit) + production bundle to dist/
npm run preview     # serve the production bundle locally
```
