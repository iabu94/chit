# Chit Draw - Technical Specification

**Version:** 1.0 | **Status:** Ready for Implementation | **Stack:** Next.js 16.1.1 + Tailwind v4 + Firebase (Firestore)

---

## 1. Feature Map

### 1.1 Admin Features (`/admin`)
| Feature ID | Feature Name | Description | Priority |
|------------|--------------|-------------|----------|
| AUTH-001 | Admin Authentication | Master code validation via Firestore | P0 |
| AUTH-002 | Session Persistence | LocalStorage-based admin session | P0 |
| USER-001 | Add User | Create user with name, generate unique code | P0 |
| USER-002 | List Users | Display all users with copy code functionality | P0 |
| USER-003 | Duplicate Prevention | Prevent duplicate user names | P0 |
| RAFFLE-001 | Start Raffle | Initialize raffle state, shuffle ranks | P0 |
| RAFFLE-002 | Live Leaderboard | Real-time rank updates as users select cards | P0 |
| RAFFLE-003 | Reset Raffle | Reset raffle to waiting state (future) | P1 |

### 1.2 Client Features (`/`)
| Feature ID | Feature Name | Description | Priority |
|------------|--------------|-------------|----------|
| ACCESS-001 | Code Entry | Validate user code, join session | P0 |
| ACCESS-002 | Auto-login | Silent login via LocalStorage on refresh | P0 |
| ACCESS-003 | Switch User | Logout and return to code entry | P0 |
| DRAW-001 | Waiting Screen | Display waiting state until raffle starts | P0 |
| DRAW-002 | Card Grid | Display identical cards when raffle active | P0 |
| DRAW-003 | Card Selection | Click card to reveal rank (transaction-based) | P0 |
| DRAW-004 | Results Display | Show name and rank after selection | P0 |
| DRAW-005 | Single Click Prevention | Disable multiple card selections | P0 |

---

## 2. System Architecture

### 2.1 Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐              ┌──────────────┐             │
│  │   Admin UI   │              │  Client UI   │             │
│  │   (/admin)   │              │     (/)      │             │
│  └──────┬───────┘              └──────┬───────┘             │
│         │                             │                      │
│         └─────────────┬───────────────┘                      │
│                       │                                      │
│              ┌────────▼────────┐                             │
│              │  Firebase SDK   │                             │
│              │  (Client-side)  │                             │
│              └────────┬────────┘                             │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ Firestore Real-time Listeners
                        │ Firestore Transactions
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Firebase Backend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Firestore Database                       │   │
│  │  ┌────────────────┐      ┌──────────────────┐        │   │
│  │  │ raffle_config  │      │     users        │        │   │
│  │  │  (Singleton)   │      │   (Collection)   │        │   │
│  │  └────────────────┘      └──────────────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Security Rules (Firestore)                   │   │
│  │  - Admin: Read/Write to raffle_config                │   │
│  │  - Users: Read raffle_config, Read/Write own user doc │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack
- **Frontend Framework:** Next.js 16.1.1 (App Router)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Backend:** Firebase (Firestore, no Functions needed)
- **State Management:** React hooks + Firestore real-time listeners
- **Authentication:** LocalStorage-based (no Firebase Auth)
- **Concurrency Control:** Firestore Transactions

### 2.3 Data Flow

#### Admin Flow:
1. Admin enters master code → Validates against `raffle_config.admin_code`
2. Admin adds users → Creates documents in `users` collection
3. Admin clicks "Start Raffle" → Updates `raffle_config.status` to `active`, generates shuffled `available_ranks`
4. Admin views leaderboard → Real-time listener on `users` collection

#### Client Flow:
1. User enters code → Validates against `users` collection
2. User waits → Real-time listener on `raffle_config.status`
3. Raffle starts → UI switches to card grid
4. User clicks card → Firestore Transaction:
   - Reads `raffle_config.available_ranks`
   - Pops last element
   - Writes to user's `rank` field
   - Updates `raffle_config.available_ranks`
5. User sees result → Local state update from transaction result

---

## 3. Firestore Schema

### 3.1 Collection: `raffle_config` (Singleton Document)
**Document ID:** `active` (fixed)

```typescript
interface RaffleConfig {
  status: "waiting" | "active" | "completed";
  available_ranks: number[]; // Shuffled array [1, 2, ..., N]
  admin_code: string; // Hashed secret (use simple hash or plain for MVP)
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**Example:**
```json
{
  "status": "active",
  "available_ranks": [5, 2, 1, 4, 3],
  "admin_code": "hashed_secret_here",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:05:00Z"
}
```

### 3.2 Collection: `users`
**Document ID:** Auto-generated (Firestore ID)

```typescript
interface User {
  id: string; // Firestore document ID (redundant but useful)
  name: string; // User's display name
  code: string; // Unique access code (e.g., "A1B2")
  rank: number | null; // Assigned rank (1 to N) or null
  has_participated: boolean; // Flag to prevent duplicate selections
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**Example:**
```json
{
  "id": "abc123",
  "name": "John Doe",
  "code": "A1B2",
  "rank": null,
  "has_participated": false,
  "created_at": "2024-01-15T10:01:00Z",
  "updated_at": "2024-01-15T10:01:00Z"
}
```

### 3.3 Indexes Required
- **users collection:** Index on `code` field (for code lookup queries)

---

## 4. API Contracts

### 4.1 Firestore Operations

#### 4.1.1 Admin Operations

**Validate Admin Code**
```typescript
// Operation: Read raffle_config document
const configDoc = await getDoc(doc(db, "raffle_config", "active"));
const isValid = configDoc.data()?.admin_code === enteredCode;
```

**Add User**
```typescript
// Operation: Create document in users collection
// Pre-check: Query users by name to prevent duplicates
const existingUser = await getDocs(
  query(collection(db, "users"), where("name", "==", userName))
);
if (!existingUser.empty) throw new Error("User already exists");

// Generate unique code
const code = generateUniqueCode(); // e.g., "A1B2"

// Create user document
await addDoc(collection(db, "users"), {
  name: userName,
  code: code,
  rank: null,
  has_participated: false,
  created_at: serverTimestamp(),
  updated_at: serverTimestamp()
});
```

**Start Raffle**
```typescript
// Operation: Update raffle_config document
// 1. Get all users
const usersSnapshot = await getDocs(collection(db, "users"));
const userCount = usersSnapshot.size;

// 2. Generate shuffled ranks [1, 2, ..., N]
const ranks = Array.from({ length: userCount }, (_, i) => i + 1);
const shuffledRanks = shuffleArray(ranks); // Fisher-Yates shuffle

// 3. Update raffle_config
await updateDoc(doc(db, "raffle_config", "active"), {
  status: "active",
  available_ranks: shuffledRanks,
  updated_at: serverTimestamp()
});
```

**Listen to Users (Leaderboard)**
```typescript
// Operation: Real-time listener on users collection
const unsubscribe = onSnapshot(
  query(collection(db, "users"), orderBy("rank", "asc")),
  (snapshot) => {
    const leaderboard = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Update UI
  }
);
```

#### 4.1.2 Client Operations

**Validate User Code**
```typescript
// Operation: Query users collection by code
const userQuery = query(
  collection(db, "users"),
  where("code", "==", enteredCode)
);
const snapshot = await getDocs(userQuery);
if (snapshot.empty) throw new Error("Invalid code");
const userData = snapshot.docs[0].data();
```

**Listen to Raffle Status**
```typescript
// Operation: Real-time listener on raffle_config
const unsubscribe = onSnapshot(
  doc(db, "raffle_config", "active"),
  (doc) => {
    const status = doc.data()?.status; // "waiting" | "active" | "completed"
    // Update UI based on status
  }
);
```

**Select Card (Transaction)**
```typescript
// Operation: Firestore Transaction
const result = await runTransaction(db, async (transaction) => {
  // 1. Read raffle_config
  const configRef = doc(db, "raffle_config", "active");
  const configDoc = await transaction.get(configRef);
  const config = configDoc.data();
  
  if (!config || config.status !== "active") {
    throw new Error("Raffle not active");
  }
  
  if (config.available_ranks.length === 0) {
    throw new Error("No ranks available");
  }
  
  // 2. Read user document
  const userRef = doc(db, "users", userId);
  const userDoc = await transaction.get(userRef);
  const user = userDoc.data();
  
  if (user?.has_participated || user?.rank !== null) {
    throw new Error("User already participated");
  }
  
  // 3. Pop last rank from array
  const ranks = [...config.available_ranks];
  const assignedRank = ranks.pop()!;
  
  // 4. Update user document
  transaction.update(userRef, {
    rank: assignedRank,
    has_participated: true,
    updated_at: serverTimestamp()
  });
  
  // 5. Update raffle_config
  transaction.update(configRef, {
    available_ranks: ranks,
    updated_at: serverTimestamp()
  });
  
  return assignedRank;
});
```

### 4.2 LocalStorage Contracts

**Admin Session**
```typescript
// Key: "chit_admin_session"
// Value: "authenticated" (or timestamp for expiry)
localStorage.setItem("chit_admin_session", "authenticated");
```

**User Session**
```typescript
// Key: "chit_user_code"
// Value: user code string (e.g., "A1B2")
localStorage.setItem("chit_user_code", userCode);
```

---

## 5. Page Routes

### 5.1 Route Structure
```
/                           → Client Code Entry / Waiting / Card Selection / Results
/admin                      → Admin Login
/admin/dashboard            → Admin Dashboard (User Management + Raffle Control)
```

### 5.2 Route Details

#### `/` (Client Route)
**File:** `app/page.tsx`

**States:**
1. **Code Entry** - User enters code
2. **Waiting** - Code validated, waiting for raffle to start
3. **Card Selection** - Raffle active, show card grid
4. **Results** - Rank assigned, show result

**Logic:**
- Check LocalStorage for `chit_user_code`
- If exists, validate and auto-navigate to appropriate state
- Real-time listener on `raffle_config.status`
- Real-time listener on user's own document for rank updates

#### `/admin` (Admin Login)
**File:** `app/admin/page.tsx`

**Functionality:**
- Master code input form
- Validate against `raffle_config.admin_code`
- On success: Set LocalStorage, redirect to `/admin/dashboard`

#### `/admin/dashboard` (Admin Dashboard)
**File:** `app/admin/dashboard/page.tsx`

**Sections:**
1. **User Management**
   - Add user form (name input)
   - User list with copy code button
   - Duplicate name prevention
2. **Raffle Control**
   - "Start Raffle" button (disabled if no users or already active)
   - Current raffle status display
3. **Live Leaderboard**
   - Real-time table of users sorted by rank
   - Shows name, code, rank (or "Waiting...")

---

## 6. Phase-wise Implementation Plan

### Phase 1: Foundation & Setup (Days 1-2)
**Goal:** Core infrastructure and Firebase setup

**Tasks:**
1. ✅ Initialize Firebase Firestore in `lib/firebase.ts`
   - Export `db` (Firestore instance)
   - Export helper functions for collections
2. ✅ Create TypeScript interfaces
   - `lib/types.ts` with `RaffleConfig`, `User` interfaces
3. ✅ Set up Firestore Security Rules (basic structure)
4. ✅ Create utility functions
   - `lib/utils/code-generator.ts` - Generate unique codes
   - `lib/utils/shuffle.ts` - Fisher-Yates shuffle algorithm
   - `lib/utils/storage.ts` - LocalStorage helpers
5. ✅ Update Firebase config to include Firestore

**Deliverables:**
- Working Firestore connection
- Type definitions
- Utility functions

---

### Phase 2: Admin Authentication & User Management (Days 3-4)
**Goal:** Admin can log in and manage users

**Tasks:**
1. Create `/admin` page
   - Code input form
   - Validation logic
   - Redirect to dashboard
2. Create `/admin/dashboard` page
   - Protected route (check LocalStorage)
   - Add user form
   - User list component
   - Copy code functionality
3. Implement Firestore operations:
   - Admin code validation
   - Add user (with duplicate check)
   - List users (real-time)
4. Create shadcn components:
   - Button, Input, Card, Table (if needed)

**Deliverables:**
- Working admin login
- User management UI
- Users stored in Firestore

---

### Phase 3: Raffle Control (Day 5)
**Goal:** Admin can start raffle

**Tasks:**
1. Implement "Start Raffle" functionality
   - Fetch all users
   - Generate shuffled ranks
   - Update `raffle_config` document
2. Add raffle status display
3. Handle edge cases:
   - No users → Disable button
   - Already active → Show warning
4. Create initial `raffle_config` document (manual or script)

**Deliverables:**
- Admin can start raffle
- Ranks generated and stored

---

### Phase 4: Client Access & Waiting State (Day 6)
**Goal:** Users can join and wait

**Tasks:**
1. Create `/` page with code entry
   - Code input form
   - Validation against Firestore
   - LocalStorage persistence
2. Implement waiting screen
   - Real-time listener on `raffle_config.status`
   - Display "Waiting for Admin to start..."
3. Auto-login on refresh (check LocalStorage)
4. "Switch User" button functionality

**Deliverables:**
- Users can enter code and join
- Waiting state works correctly

---

### Phase 5: Card Selection & Transaction (Days 7-8)
**Goal:** Users can select cards and get ranks

**Tasks:**
1. Create card grid component
   - Display when `status === "active"`
   - Identical cards (shadcn Card component)
2. Implement card click handler
   - Firestore Transaction
   - Pop rank from `available_ranks`
   - Update user document
3. Handle transaction errors:
   - Raffle not active
   - No ranks available
   - User already participated
4. Prevent multiple clicks (disable after first click)
5. Show loading state during transaction

**Deliverables:**
- Card selection works
- Transaction prevents collisions
- Users get unique ranks

---

### Phase 6: Results Display & Leaderboard (Day 9)
**Goal:** Show results and live leaderboard

**Tasks:**
1. Results screen
   - Show user name and rank
   - Hide card grid after selection
2. Admin leaderboard
   - Real-time listener on users collection
   - Sort by rank (ascending)
   - Update as users select cards
3. Handle completed state
   - Mark raffle as "completed" when all ranks assigned

**Deliverables:**
- Results display correctly
- Leaderboard updates in real-time

---

### Phase 7: Polish & Edge Cases (Day 10)
**Goal:** Production readiness

**Tasks:**
1. Error handling
   - Network errors
   - Invalid codes
   - Transaction failures
2. Loading states
   - Spinners during operations
3. UI/UX improvements
   - Responsive design
   - Animations (optional)
   - Toast notifications (shadcn)
4. Firestore Security Rules (final)
   - Admin read/write rules
   - User read/write rules
5. Testing
   - Test concurrent card selections
   - Test refresh scenarios
   - Test edge cases

**Deliverables:**
- Production-ready application
- All edge cases handled

---

## 7. Security Rules (Firestore)

### 7.1 Rules Structure
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check admin code
    function isAdmin() {
      // Note: This is a simplified check
      // In production, use Firebase Auth or a more secure method
      return request.auth != null || 
             resource.data.admin_code == request.resource.data.admin_code;
    }
    
    // Raffle config - read by all, write by admin only
    match /raffle_config/{configId} {
      allow read: if true; // All users can read status
      allow write: if false; // Admin writes via client (consider Functions for production)
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read (for leaderboard)
      allow read: if true;
      
      // Users can only update their own document (by code match)
      // Admin can create/update any user
      allow create: if true; // Simplified for MVP
      allow update: if request.resource.data.code == resource.data.code ||
                     isAdmin();
      allow delete: if false; // No deletes for MVP
    }
  }
}
```

**Note:** For MVP, we'll use simplified rules. In production, consider:
- Firebase Auth for admin
- Cloud Functions for admin operations
- More restrictive read rules

---

## 8. Component Structure

### 8.1 Component Hierarchy

```
app/
├── layout.tsx (Root layout)
├── page.tsx (Client route - all states)
├── admin/
│   ├── page.tsx (Admin login)
│   └── dashboard/
│       └── page.tsx (Admin dashboard)
│
components/
├── ui/ (shadcn components)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── client/
│   ├── CodeEntry.tsx
│   ├── WaitingScreen.tsx
│   ├── CardGrid.tsx
│   └── ResultsDisplay.tsx
└── admin/
    ├── UserManagement.tsx
    ├── RaffleControl.tsx
    └── Leaderboard.tsx

lib/
├── firebase.ts (Firebase initialization)
├── types.ts (TypeScript interfaces)
└── utils/
    ├── code-generator.ts
    ├── shuffle.ts
    └── storage.ts
```

---

## 9. Development Notes

### 9.1 Code Generation Algorithm
```typescript
// Generate unique 4-character alphanumeric code
function generateUniqueCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Check uniqueness against Firestore (query by code)
  return code;
}
```

### 9.2 Shuffle Algorithm
```typescript
// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### 9.3 Initial Setup Script
Create a script to initialize the `raffle_config` document:
```typescript
// scripts/init-raffle-config.ts
// Run once to create initial raffle_config document
```

---

## 10. Success Criteria

### 10.1 Functional Requirements
- ✅ Admin can authenticate and manage users
- ✅ Users can join via code
- ✅ Raffle can be started with shuffled ranks
- ✅ Users can select cards without collisions
- ✅ All users receive unique ranks (1 to N)
- ✅ Leaderboard updates in real-time

### 10.2 Non-Functional Requirements
- ✅ UI updates within 1 second of state changes
- ✅ No duplicate ranks assigned (transaction-based)
- ✅ Clean, consistent UI using shadcn components
- ✅ Works on mobile and desktop

---

## 11. Future Enhancements (Out of Scope)

- Reset raffle functionality
- Multiple raffle sessions
- Firebase Auth integration
- Cloud Functions for admin operations
- Analytics and metrics
- Export results to CSV
- Custom card designs
- Sound effects / animations

---

**Document Status:** Ready for Implementation
**Last Updated:** 2024-01-15
**Next Review:** After Phase 1 completion
