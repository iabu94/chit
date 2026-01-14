# Chit Draw - Product Requirements Document

**Version:** 1.0 | **Status:** Ready for Development | **Stack:** Next.js + shadcn + Firestore

## 1. Executive Summary
* **Problem Statement:** Organizing a fair, randomized selection process (raffle) for a group of people often requires physical materials or clunky tools that lack transparency.
* **Proposed Solution:** A lightweight, real-time web application where an Admin manages users and triggers a raffle. Users join via a unique code, pick a virtual "card" simultaneously, and receive an instant, collision-free rank (1 to N).
* **Value Proposition:**
    * **Fairness:** Cryptographically secure randomization via server-side shuffling.
    * **Speed:** Instant results with no manual counting.
    * **Simplicity:** No registration required—just a code.

## 2. Target Audience
* **Primary Persona (Admin):** The event organizer. Needs a friction-free interface to input names, generate codes, and control the flow of the raffle.
* **Secondary Persona (Participant):** The user. Needs a dead-simple interface to "Login" via code, wait, and click a card.

## 3. Functional Requirements & User Stories

### 3.1 Admin Panel (`/admin`)
* **Epic: Authentication**
    * **Story:** As an Admin, I want to enter a secret master code so that I can access the admin dashboard.
    * **Acceptance Criteria:** Code is validated against a Firestore document (e.g., `config/admin`). On success, store ID in LocalStorage and redirect.

* **Epic: User Management**
    * **Story:** As an Admin, I want to add users by name so that the system generates a unique GUID code for them.
    * **Story:** As an Admin, I want to see a list of added users with a "Copy Code" button so I can distribute credentials easily.
    * **Story:** As an Admin, I want to ensure no duplicate users exist in a single raffle instance.

* **Epic: Raffle Control**
    * **Story:** As an Admin, I want to click "Start Raffle" so that the system transitions all connected users from the "Waiting" screen to the "Card Selection" screen.
    * **Technical Logic:**
        1. Fetch all active users ($N$).
        2. Generate an array `[1, 2, ... N]`.
        3. Shuffle the array.
        4. Save this array as `available_ranks` in the active raffle document.
        5. Update `status` to `active`.

* **Epic: Live Monitoring**
    * **Story:** As an Admin, I want to see a real-time leaderboard that updates as users reveal their ranks.

### 3.2 Client UI (`/`)
* **Epic: Access**
    * **Story:** As a User, I want to enter my unique code so that I can join the session.
    * **Acceptance Criteria:**
        * Validate code against Firestore `users` collection.
        * Store code in LocalStorage (Silent login on refresh).
        * If raffle `status` is `waiting`, show "Waiting for Admin to start..."

* **Epic: The Draw (Card Selection)**
    * **Story:** As a User, I want to see a grid of identical cards once the raffle starts.
    * **Story:** As a User, I want to click **any** card to reveal my rank.
    * **Technical Logic (Collision Prevention):**
        * On click, fire a **Firestore Transaction**.
        * Read `available_ranks` array.
        * Pop the *last* number from the array.
        * Write the number to the user's document field `rank`.
        * Update the `available_ranks` array in Firestore.
        * **Constraint:** This ensures two users clicking at the same millisecond never get the same number.

* **Epic: Results & State**
    * **Story:** As a User, once I have clicked, I want the cards to disappear and see my Name and Rank displayed clearly.
    * **Story:** As a User, I want to be prevented from clicking more than once.

* **Epic: Shared Device Support**
    * **Story:** As a User, I want a "Switch User" button that logs me out (clears LocalStorage) and returns to the code entry screen so another person can take their turn on the same device.

## 4. Technical Specifications

### 4.1 Data Model (Firestore)
**Collection: `raffle_config`** (Singleton)
```json
{
  "status": "waiting", // waiting | active | completed
  "available_ranks": [5, 2, 1, 4, 3], // The shuffled deck
  "admin_code": "hashed_secret"
}
```

Collection: users

```JSON
{
  "id": "guid_123",
  "name": "John Doe",
  "code": "A1B2", // The access code
  "rank": null, // Updates to number (e.g., 1) after click
  "has_participated": false
}
```

4.2 Non-Functional Requirements
Performance: UI updates must reflect raffle state changes (Waiting -> Active) within <1 second.

Concurrency: The system must handle multiple users clicking cards simultaneously without assigning duplicate ranks (handled via Firestore Transactions).

Simplicity: UI must use Shadcn components for a clean, consistent look with minimal custom CSS.

5. Success Metrics
Draw Success: 100% of participants receive a unique rank between 1 and N.

Usability: 0 users report "getting stuck" on the loading screen due to refresh/state errors.

6. Assumptions & Risks
Assumption: The number of users is relatively small (<100) per session.

Risk: Users losing internet connection right before clicking.

Mitigation: Optimistic UI is disabled for the click action; we wait for the Transaction result to ensure data integrity.