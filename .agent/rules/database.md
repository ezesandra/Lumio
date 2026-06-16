---
trigger: always_on
---

# Database Rules — Lumio

## Technology

- **Database:** PostgreSQL
- **ORM:** Prisma (strict mode, typed client)
- **Migrations:** Prisma Migrate — every schema change goes through a migration file
- **Connection:** `DATABASE_URL` environment variable — never hardcoded

---

## Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────

enum Tier {
  FREE
  STANDARD
  PREMIUM
}

enum DocumentStatus {
  PROCESSING
  READY
  FAILED
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  GRACE_PERIOD
}

enum XPAction {
  UPLOAD
  QUIZ_COMPLETE
  FLASHCARD_COMPLETE
  DAILY_LOGIN
  STREAK_7_DAY
  STREAK_30_DAY
}

// ─── Models ──────────────────────────────────────────────

model User {
  id                    String        @id @default(cuid())
  name                  String
  email                 String        @unique
  passwordHash          String?
  emailVerified         DateTime?
  subscriptionTier      Tier          @default(FREE)
  subscriptionExpiresAt DateTime?
  xpTotal               Int           @default(0)
  tokenVersion          Int           @default(0)
  streakCount           Int           @default(0)
  lastStudyDate         DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  documents             Document[]
  quizAttempts          QuizAttempt[]
  subscriptions         Subscription[]
  xpLogs                XPLog[]
  accounts              Account[]     // NextAuth OAuth accounts
  sessions              Session[]     // NextAuth sessions

  @@map("users")
}

model Document {
  id             String         @id @default(cuid())
  userId         String
  fileName       String
  fileUrl        String
  fileHash       String
  fileSize       Int
  topicTag       String
  studyGoal      String
  status         DocumentStatus @default(PROCESSING)
  failureReason  String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  studyContent    StudyContent?
  quizAttempts    QuizAttempt[]

  @@unique([userId, fileHash])
  @@index([userId])
  @@map("documents")
}

model StudyContent {
  id                    String   @id @default(cuid())
  documentId            String   @unique
  summary               String
  simplifiedExplanation String?
  flashcards            Json     @default("[]")
  quizQuestions         Json     @default("[]")
  youtubeLinks          Json     @default("[]")
  generatedAt           DateTime @default(now())
  updatedAt             DateTime @updatedAt

  document              Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("study_contents")
}

model QuizAttempt {
  id             String   @id @default(cuid())
  userId         String
  documentId     String
  score          Int
  totalQuestions Int
  completedAt    DateTime @default(now())

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  document       Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([userId, documentId])
  @@index([documentId])
  @@map("quiz_attempts")
}

model Subscription {
  id               String             @id @default(cuid())
  userId           String
  plan             Tier
  billingCycle     BillingCycle
  status           SubscriptionStatus @default(ACTIVE)
  paymentReference String?
  startedAt        DateTime           @default(now())
  expiresAt        DateTime
  cancelledAt      DateTime?
  updatedAt        DateTime           @updatedAt

  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@map("subscriptions")
}

model XPLog {
  id        String   @id @default(cuid())
  userId    String
  action    XPAction
  xpAwarded Int
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("xp_logs")
}

// ─── NextAuth Models ──────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

---

## Query Rules

### Always select only needed fields

```ts
// Good
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, subscriptionTier: true, xpTotal: true },
})

// Bad — fetches passwordHash, sensitive fields unnecessarily
const user = await prisma.user.findUnique({ where: { id: userId } })
```

### Always scope queries to the authenticated user

```ts
// Good
const documents = await prisma.document.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: "desc" },
})
```

### Use transactions for multi-step writes

```ts
// Awarding XP and updating streak must succeed together or not at all
await prisma.$transaction([
  prisma.user.update({
    where: { id: userId },
    data: { xpTotal: { increment: xpAmount }, streakCount: newStreak },
  }),
  prisma.xPLog.create({
    data: { userId, action, xpAwarded: xpAmount },
  }),
])
```

### Validate before every write

Zod validation must happen before **any** Prisma mutation. See `code-style.md`.

---

## Indexing Strategy

Key indexes defined in the schema:

| Table | Index | Reason |
|---|---|---|
| `User` | `email` (unique) | Login lookup |
| `Document` | `userId` | Fetch user's library |
| `Document` | `[userId, fileHash]` (unique) | Duplicate detection — same user cannot upload the same file twice |
| `QuizAttempt` | `[userId, documentId]`, `documentId` | Progress queries by user + document, or by document alone |
| `Subscription` | `userId`, `status` | Tier validation and active-sub queries |
| `XPLog` | `userId` | XP history lookup |

---

## StudyContent JSON Shapes

The `Json` fields on `StudyContent` must follow these structures:

### `flashcards`
```ts
type Flashcard = {
  id: string
  front: string
  back: string
}
// Stored as an array: Flashcard[]
```

### `quizQuestions`
```ts
type QuizQuestion = {
  id: string
  question: string
  options: string[]        // 4 options for MCQ
  correctIndex: number     // index into options
  explanation: string
}
// Stored as an array: QuizQuestion[]
```

### `youtubeLinks`
```ts
type YouTubeLink = {
  title: string
  url: string
  channelName: string
  thumbnailUrl: string
}
// Stored as an array: YouTubeLink[]
```

These shapes are enforced by the AI processing layer (`lib/ai.ts`) — if the AI response deviates, it is rejected and retried.

---

## VerificationToken Cleanup

Expired tokens accumulate in the `VerificationToken` table. Two strategies to keep it clean:

- **Scheduled cleanup:** Run `DELETE FROM verification_tokens WHERE expires < NOW()` via a cron job (e.g. Vercel Cron Jobs) every 24 hours
- **On-access cleanup:** During login, reset-password, or verify-email flows, include a `deleteMany({ expires: { lt: new Date() } })` step before querying tokens

The cron approach is preferred for v1 — it keeps request latency low and is trivial to set up.

---

## Migrations

- Every schema change goes through `prisma migrate dev` (development) or `prisma migrate deploy` (production)
- Migration files are committed to the repo — never edited after they are applied
- Never use `prisma db push` in production — it bypasses migration history
- Run `prisma generate` after every schema change to regenerate the typed client
- **Rollback strategy:** If a migration fails in production, run `prisma migrate resolve --rolled-back <migration-name>` to mark it as rolled back, then apply the previous migration using `prisma migrate deploy` on the prior commit. Never manually alter the `_prisma_migrations` table.
- Test all migrations against a staging database before deploying to production — use Vercel Preview + a staging Postgres instance

---

## Data Retention & Deletion

- On account deletion: cascade delete all `Document`, `StudyContent`, `QuizAttempt`, `Subscription`, `XPLog`, `Account`, `Session` records
- Uploaded files in cloud storage are deleted separately via `lib/storage.ts` before the DB record is removed
- `passwordHash` is never returned in any query `select` unless explicitly required (e.g. login)
- **Soft deletes:** Not implemented in v1. All deletions are hard cascading deletes. If soft-delete is needed later (e.g. user "deactivation" during a grace period), add a `deletedAt DateTime?` field to the relevant models and filter with `where: { deletedAt: null }` in all queries

---

## Seed Data (Development Only)

- A `prisma/seed.ts` file provides test users for each tier (FREE, STANDARD, PREMIUM)
- Seed is never run in production — guarded by `NODE_ENV !== "production"` check