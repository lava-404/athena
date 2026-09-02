# FocusRoom

A calm, Google-Meet-style video room with a companion — the **Buddy** — who
sits with you, and a dedicated **Python AI backend** that watches posture,
gaze/attention, and continuous work duration, and generates the Buddy's
nudges through the Anthropic API. Sessions are tied to a real account
(Privy) and logged to Supabase, with a dashboard to review trends.

## Architecture at a glance

```
┌─────────────────────┐        websocket (frames)        ┌──────────────────────┐
│  Next.js frontend    │ ───────────────────────────────▶ │  Python AI backend    │
│  (this repo's root)  │ ◀─────────────────────────────── │  (backend/)           │
│  - Buddy character   │        scores + nudge events      │  - MediaPipe pose/gaze│
│  - Meet-style room UI│                                    │  - Anthropic nudges   │
│  - Privy auth        │        REST (session history)      │  - Privy verification │
│  - Dashboard         │ ◀─────────────────────────────── │  - Supabase persistence│
└──────────────────────┘                                    └──────────────────────┘
```

**No posture, gaze, or attention inference happens in TypeScript anywhere in
this repo.** The frontend's only job re: vision is capturing frames off the
`<video>` element and shipping them to the backend; every score and every
nudge decision comes back over the websocket. See `backend/README.md` for
the backend's own architecture notes.

## Running it locally

You need **both** services running.

### 1. AI backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in PRIVY_APP_ID / PRIVY_VERIFICATION_KEY at minimum
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_PRIVY_APP_ID
npm run dev
```

Open http://localhost:3000. Log in (Privy handles both login and signup in
one flow), create a room, allow camera access, and lock in with Buddy.

### 3. Supabase (optional, for session history)

Run `supabase/schema.sql` against your Supabase project, then set
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. Without
this, sessions simply won't persist (logged, not fatal) — everything else
still works.

## What you need to bring

None of these can be generated from this repo — you need real accounts:

| Service | Why | Where to get it |
|---|---|---|
| **Privy** | Login/signup, protects rooms + dashboard | https://dashboard.privy.io — App ID is public; the ES256 verification key for the backend is under App settings → Access Tokens |
| **Anthropic** | Generates the Buddy's actual nudge wording | https://console.anthropic.com/settings/keys |
| **Supabase** | Session history persistence | https://supabase.com — use the **service role** key on the backend only, never the frontend |

The app runs and the Buddy character works without any of these configured
(auth will just refuse to let you into a room, per the "protect
user-specific data" requirement), but you won't get real login, AI-written
nudges, or a populated dashboard until they're set.

## Project structure

```
src/
  app/
    page.tsx                    Landing: login, then create/join a room
    room/[roomId]/page.tsx      The meeting room (Meet-style layout)
    dashboard/page.tsx          Session history + analytics
    providers.tsx               Privy provider wrapper
    api/livekit-token/route.ts  Stub token route for future multi-peer video

  components/
    Buddy/                      Character, expressions, speech bubble, panel
    room/                       RoomTopBar, RoomBottomBar, PeoplePanel
    dashboard/                  StatsCards, TrendChart, SessionList
    auth/AuthControls.tsx       Login button / user menu
    VideoTile.tsx, ChatPanel.tsx, SettingsPanel.tsx, LockedInOverlay.tsx

  hooks/
    useWebcam.ts                Camera/mic stream (see camera-preview fix below)
    useBackendVision.ts         Streams frames to the AI backend, applies results
    useSessionTimer.ts          Ticks session/break clocks for display

  lib/
    store/sessionStore.ts       Zustand: lock state, Buddy state, settings, chat
    api/backend.ts              REST + websocket client for the Python backend
    auth/useRequireAuth.ts      Route protection hook

  types/index.ts                 Shared types, mirrors the backend's message shapes

backend/                          Python AI backend — see backend/README.md
supabase/schema.sql                Session history table
```

## Notable fixes and decisions in this pass

**Camera preview bug, actually fixed.** The stream used to be attached to
`videoRef.current.srcObject` inline inside the permission-request handler —
a race, since the `<video>` element behind the permission gate hadn't
mounted yet at that exact moment. It's now attached in a `useEffect` keyed
on the permission state, which is guaranteed to run after React has
committed the DOM and attached the ref. See the comment in
`src/hooks/useWebcam.ts`.

**Why the vision pipeline moved to Python entirely.** Per the requirement,
there is no TypeScript posture/gaze code left in this repo — `usePostureDetection.ts`
and the old `lib/posture/*` files are deleted. `useBackendVision.ts` only
captures and transmits frames; `backend/app/vision/*` and
`backend/app/session/manager.py` own all scoring and nudge-timing logic.

**Why the Python backend also owns Supabase.** Privy is the auth provider,
not Supabase Auth, so Supabase's row-level security can't be keyed off
`auth.uid()`. Rather than shipping a service-role key to the frontend (a
real security problem) or bolting on a second JWT bridge, the backend is
the only thing that ever holds Supabase credentials; the dashboard calls
the backend's `/sessions` and `/sessions/stats` REST routes, which verify
the Privy token themselves before touching Supabase.

**Why nudges are AI-generated, not string tables.** `backend/app/nudges/generator.py`
calls the Anthropic API with the session's recent messages included, so it
avoids repeating phrasing. A small local fallback list exists ONLY for
Anthropic API outages — every successful nudge in normal operation is
generated, not templated. See that file's module docstring for the exact
scope of the fallback.

**UI redesign.** The room page now follows Meet's actual layout shape: a
top bar with room identity + connection status + panel toggles (People /
Chat / Buddy settings), a large central video stage, and a floating
pill-shaped control bar at the bottom center. The Buddy panel is
deliberately NOT one of the toggleable side panels — it stays permanently
visible to the local user, per the original product requirement that Buddy
is always present and never shown to other participants.

## Known limitations of this slice

- **Single participant in the video grid.** LiveKit's token route exists
  (`api/livekit-token`) but isn't wired into the room UI — see the original
  MVP's next-steps note, still true here.
- **People panel** shows only the local user; real participant presence
  needs the LiveKit wiring above.
- **Chat** is local-only (not synced across participants), same reason.
- **Voice lines** toggle exists in settings; no audio is wired up yet.
- The Python backend creates fresh MediaPipe landmarker instances per
  websocket connection for correctness under concurrency (see
  `backend/README.md`) — fine for a handful of simultaneous users, would
  want a worker pool for real scale.

## Next steps

1. Wire LiveKit into the room UI for real multi-participant video (backend token route is ready).
2. Add a Farcaster/passkey login method to Privy if you want passwordless-only auth.
3. Move the character to Rive once a `.riv` asset exists (see `components/Buddy/Buddy.tsx`'s header comment).
4. Add a background worker pool for the vision backend if you expect concurrent load beyond a small team.
5. Sync chat across participants once LiveKit's data channel is wired up.
