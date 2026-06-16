# SKILL.md — DB Migration Runner

## Purpose

This skill covers everything related to Prisma schema management in Lumio — defining models, running migrations, seeding data, and safely evolving the database schema over time without data loss.

---

## When to Use This Skill

- Adding a new model or field to `schema.prisma`
- Running or rolling back migrations
- Seeding the database for development or testing
- Renaming or removing fields safely
- Debugging migration or connection errors

---

## Setup

### 1. Install Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

### 2. Set `DATABASE_URL`

```env
# .env.local
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lumio?schema=public"
```

For local development with Docker:

```bash
docker run --name lumio-db \
  -e POSTGRES_USER=lumio \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=lumio \
  -p 5432:5432 -d postgres:15
```

```env
DATABASE_URL="postgresql://lumio:secret@localhost:5432/lumio?schema=public"
```

---

## Full Schema Reference

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

model User {
  id                    String        @id @default(cuid())
  name                  String
  email                 String        @unique
  passwordHash          String?
  emailVerified         DateTime?
  subscriptionTier      Tier          @default(FREE)
  subscriptionExpiresAt DateTime?
  tokenVersion          Int           @default(0)
  xpTotal               Int           @default(0)
  streakCount           Int           @default(0)
  lastStudyDate         DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  documents             Document[]
  quizAttempts          QuizAttempt[]
  subscriptions         Subscription[]
  xpLogs                XPLog[]
  accounts              Account[]
  sessions              Session[]

  @@index([email])
}

model Document {
  id            String         @id @default(cuid())
  userId        String
  fileName      String
  fileUrl       String
  fileHash      String
  fileSize      Int
  topicTag      String
  studyGoal     String
  status        DocumentStatus @default(PROCESSING)
  failureReason String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  studyContent  StudyContent?
  quizAttempts  QuizAttempt[]

  @@unique([userId, fileHash])
  @@index([userId])
  @@index([fileHash])
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

  document              Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
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

  @@index([userId])
  @@index([documentId])
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
}

model XPLog {
  id        String   @id @default(cuid())
  userId    String
  action    XPAction
  xpAwarded Int
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ─── NextAuth ────────────────────────────────────────────

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
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## Migration Commands

### Development — create and apply a migration

```bash
npx prisma migrate dev --name descriptive-migration-name
```

Examples of good names:
```
add-streak-count-to-user
add-simplified-explanation-to-study-content
create-xp-log-table
rename-quiz-result-to-quiz-attempt
```

### Production — apply pending migrations

```bash
npx prisma migrate deploy
```

Run this in the Vercel build step or CI pipeline — **never** `migrate dev` in production.

### Check migration status

```bash
npx prisma migrate status
```

### Generate Prisma client after schema changes

```bash
npx prisma generate
```

Must be run after every `schema.prisma` edit — regenerates the typed client.

### Open Prisma Studio (visual DB browser)

```bash
npx prisma studio
```

---

## Safe Schema Evolution Patterns

### Adding a nullable field (safe — no migration data risk)

```prisma
model User {
  // new optional field
  avatarUrl String?
}
```

```bash
npx prisma migrate dev --name add-avatar-url-to-user
```

### Adding a required field (requires a default or two-step migration)

```prisma
// Step 1 — add as optional
model Document {
  processingNote String?
}

// Step 2 (later) — backfill data, then make required
model Document {
  processingNote String @default("")
}
```

### Renaming a field (NEVER rename directly — data loss risk)

```prisma
// Step 1 — add new field
model User {
  displayName String?   // new
  name        String    // keep old
}
```

Backfill `displayName` from `name` in a data migration script, then remove `name` in a follow-up migration.

### Adding an index

```prisma
model Document {
  @@index([topicTag])
}
```

Safe — no data change, just index creation.

---

## Seed File (`prisma/seed.ts`)

```ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed must not run in production")
  }

  const hash = await bcrypt.hash("password123", 12)

  const users = [
    { email: "free@lumio.test",      tier: "FREE"     as const },
    { email: "standard@lumio.test",  tier: "STANDARD" as const },
    { email: "premium@lumio.test",   tier: "PREMIUM"  as const },
  ]

  for (const { email, tier } of users) {
    await prisma.user.upsert({
      where:  { email },
      update: {},
      create: {
        name:             tier.charAt(0) + tier.slice(1).toLowerCase() + " User",
        email,
        passwordHash:     hash,
        emailVerified:    new Date(),
        subscriptionTier: tier,
      },
    })
  }

  console.log("✅ Seed complete")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:

```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
}
```

Run seed:

```bash
npx prisma db seed
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `P1001: Can't reach database` | Wrong `DATABASE_URL` or DB not running | Check connection string and Docker container |
| `P3005: Database schema is not empty` | First migration on existing DB | Run `prisma migrate resolve --applied 0_init` |
| `P2025: Record not found` | `findUnique` returned null, then accessed | Always null-check before accessing result |
| `Environment variable not found: DATABASE_URL` | `.env.local` not loaded | Ensure `.env.local` exists and Prisma reads it |
| `Column does not exist` | Generated client out of date | Run `npx prisma generate` |
| Migration drift warning | Schema and DB out of sync in dev | Run `npx prisma migrate reset` (dev only — wipes data) |

---

## CI / Deployment Checklist

- [ ] `DATABASE_URL` set in Vercel environment variables
- [ ] `npx prisma generate` runs as part of the build command
- [ ] `npx prisma migrate deploy` runs before the app starts (add to `postinstall` or build step)
- [ ] Seed script is guarded against running in production
- [ ] Migration files are committed to version control