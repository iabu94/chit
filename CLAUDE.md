# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chit Draw** is a real-time raffle/draw application built with Next.js 16 and Firebase Firestore. It enables an admin to manage users and trigger a synchronized draw where participants select virtual "cards" to receive collision-free random ranks (1 to N).

**Key characteristics:**
- Client-side Firebase SDK (no Cloud Functions)
- LocalStorage-based authentication (no Firebase Auth)
- Firestore transactions for collision-free rank assignment
- Real-time updates using Firestore listeners
- Shadcn/ui components with Tailwind v4

## Development Commands

```bash
# Development server (port 3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Architecture

### Data Model (Firestore)

**Collection: `raffle_config` (singleton document at `raffle_config/active`)**
- `status`: "waiting" | "active" | "completed"
- `available_ranks`: number[] - shuffled array that decreases as users pick
- `admin_code`: string - plain text admin password
- `created_at`, `updated_at`: Timestamp

**Collection: `users`**
- `name`: string - display name
- `code`: string - unique access code (e.g., "A1B2")
- `rank`: number | null - assigned rank after card selection
- `has_participated`: boolean - prevents duplicate selections
- `has_joined`: boolean - tracks if user entered their code
- `created_at`, `updated_at`: Timestamp

### Application Flow

**Admin Flow (`/admin` → `/admin/dashboard`)**
1. Enter admin code → validates against `raffle_config.admin_code`
2. Add users by name → generates unique codes, stores in `users` collection
3. Start raffle → shuffles ranks into `available_ranks`, sets status to "active"
4. Monitor real-time leaderboard as users select cards

**Client Flow (`/`)**
1. Enter unique code → validates against `users` collection, stores in LocalStorage
2. Wait screen → Firestore listener on `raffle_config.status`
3. Card selection (when raffle active) → displays wheel/card grid
4. Click card → **Firestore transaction** pops from `available_ranks`, assigns to user's `rank` field
5. Results display → shows assigned rank, allows switching users

### Critical Implementation Details

**Collision Prevention**
- Card selection uses `lib/utils/card-selection.ts` with Firestore transactions
- Transaction atomically: reads `available_ranks`, pops last element, assigns to user, updates both documents
- This prevents race conditions when multiple users click simultaneously

**State Management**
- No Redux/Zustand - uses React hooks + Firestore real-time listeners
- LocalStorage for session persistence (`lib/utils/storage.ts`)
  - Admin: `chit_admin_session` = "authenticated"
  - User: `chit_user_code` = user's access code

**Component Organization**
- `/components/admin/*` - Admin dashboard components (UserManagement, RaffleControl, Leaderboard)
- `/components/client/*` - Client-facing components (CodeEntry, WaitingScreen, Wheel, ResultsDisplay)
- `/components/ui/*` - Shadcn components (Button, Card, Input)

**Routing**
- `/` - Client interface (code entry, waiting, card selection, results)
- `/admin` - Admin login
- `/admin/dashboard` - Admin control panel

## Firebase Configuration

Firebase config is in `firebase.ts` with public API keys (safe for client-side usage).

**Important exports:**
- `db` - Firestore instance
- `usersCollection` - reference to users collection
- `raffleConfigDoc` - reference to `raffle_config/active` document
- `getUserDoc(userId)` - helper to get user document reference

**Security Rules** (`firestore.rules`)
- MVP setup: permissive rules (all reads/writes allowed for simplicity)
- Production consideration: restrict writes to authenticated admins

## Utility Functions

**`lib/utils/card-selection.ts`**
- `selectCard(userId)` - Transaction-based rank assignment (core draw logic)

**`lib/utils/storage.ts`**
- `adminStorage` - Admin session management
- `userStorage` - User code persistence

**`lib/utils/code-generator.ts`**
- Generates unique 4-character alphanumeric codes for users

**`lib/utils/shuffle.ts`**
- Fisher-Yates shuffle for `available_ranks` array

**`lib/utils/init-raffle-config.ts`**
- Initializes raffle configuration document

## Important Patterns

1. **Always use transactions for rank assignment** - Never directly update user ranks or available_ranks outside of a transaction
2. **Real-time listeners for state changes** - Use `onSnapshot` for raffle status and leaderboard updates
3. **LocalStorage checks** - Always check `typeof window !== "undefined"` before accessing localStorage
4. **Path aliases** - Use `@/` prefix (configured in tsconfig.json) for imports from root

## Documentation

Comprehensive documentation in `/docs`:
- `PRD.md` - Product requirements and user stories
- `TECHNICAL_SPEC.md` - Detailed technical architecture
- `SPRINT_BACKLOG.md` - Development progress tracking

## MCP Configuration

Shadcn MCP server configured in `.cursor/mcp.json` for UI component management.
