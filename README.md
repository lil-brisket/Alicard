# Alicard V2

A turn-based MMORPG built with the [T3 Stack](https://create.t3.gg/).

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or remote)
- Docker or Podman (optional, for local database)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/alicard?schema=public"

# NextAuth
AUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Optional: OAuth Providers (for production)
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""
# AUTH_GITHUB_ID=""
# AUTH_GITHUB_SECRET=""
# AUTH_DISCORD_ID=""
# AUTH_DISCORD_SECRET=""
```

### 3. Set Up Database

#### Option A: Using Docker (Recommended for local development)

On Windows:

1. Install [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) and [Docker Desktop](https://docs.docker.com/docker-for-windows/install/)
2. Open WSL terminal: `wsl`
3. Navigate to project directory
4. Run: `./start-database.sh`

On Linux/macOS:

```bash
./start-database.sh
```

#### Option B: Using Existing PostgreSQL

Ensure your PostgreSQL server is running and update `DATABASE_URL` in `.env` with your connection string.

### 4. Run Database Migrations

#### ⚠️ IMPORTANT: Production Workflow

This project uses **Prisma Migrations** exclusively. Never use `prisma db push` in production.

**For Development:**

If you have existing data, run the cleanup script first to handle duplicate records:

```bash
npm run db:cleanup
```

Then create and apply migrations:

```bash
npm run db:generate
```

This will:

- Generate Prisma Client
- Create a new migration file (if schema changed)
- Apply all pending migrations
- Create/update all necessary tables

**For Production:**

```bash
npm run db:migrate
```

This applies all pending migrations without creating new ones.

**Checking for Drift:**

Before committing, always check for migration drift:

```bash
npm run db:check
```

**Note:** The cleanup script merges duplicate `InventoryItem` records (same playerId + itemId) by summing quantities, and handles duplicate `Item` keys. If you're starting fresh, you can skip the cleanup step.

### 5. Start Development Server

```bash
npm run dev
```

The game will be available at [http://localhost:3000](http://localhost:3000)

### 6. Seed Database (Optional)

To populate the database with initial game data including jobs, items, recipes, and test accounts, run:

```bash
npm run db:seed
```

**Seeded Test Accounts:**

The seed script creates the following test accounts for different user roles:

| Role | Email | Username | Password |
|------|-------|----------|----------|
| Admin | `admin@alicard.com` | `admin` | `admin123` |
| Moderator | `mod@alicard.com` | `mod` | `mod123` |
| Content | `content@alicard.com` | `content` | `content123` |
| Player | `player@alicard.com` | `player` | `player123` |

**⚠️ Security Note:** These are default passwords for development only. Change them immediately in production or before deploying to any public environment.

The seed script also creates:

- Default world map with tiles
- Base jobs (Blacksmith, Tailor, Alchemist, Cook, Miner, Fisher, Herbalist, Logger)
- Items and equipment
- Recipes and crafting materials
- Gathering nodes
- Skills
- Achievements
- Monsters

## Database Migration Workflow

### ⚠️ CRITICAL: Production-Grade Migration Policy

This project enforces a **migration-only workflow**. All database schema changes must go through Prisma migrations.

### Quick Reference

- **Development**: `npm run db:generate` - Create and apply migration
- **Production**: `npm run db:migrate` - Apply pending migrations
- **Check Drift**: `npm run db:check` - Verify schema sync (run before commits)
- **❌ NEVER**: `prisma db push` (disabled)

### Full Documentation

See [`prisma/MIGRATION_WORKFLOW.md`](./prisma/MIGRATION_WORKFLOW.md) for complete workflow documentation.

## Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Create migration and apply it (development)
- `npm run db:migrate` - Apply pending migrations (production)
- `npm run db:check` - Check for migration drift (run before commits)
- `npm run db:cleanup` - Clean up duplicate records before migration (if needed)
- `npm run db:seed` - Seed the database with initial game data
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

**⚠️ Database Schema Changes:**

- **ALWAYS** use `npm run db:generate` to create migrations
- **NEVER** use `prisma db push` (disabled in this project)
- **ALWAYS** run `npm run db:check` before committing schema changes

## Admin Features

### Admin Action Log

The admin action log provides a complete audit trail of all administrative actions performed on user accounts. **Action logs are player-specific** and can be viewed in two ways:

1. **Player-Specific Action Log**: View actions for a specific player by navigating to their user detail page (`/admin/users/[userId]`). The "Recent Admin Actions" section displays all actions performed on that specific player's account.

2. **Global Action Log**: View all admin actions across the system at `/admin/actions` (available to moderators, admins, and content managers).

**Action Log Features:**
- Tracks all admin actions (user updates, bans, mutes, role changes, etc.)
- Records the actor (admin who performed the action), target user, action type, reason, and timestamp
- Player-specific filtering on user detail pages
- Complete audit trail for compliance and security

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [tRPC](https://trpc.io) - End-to-end typesafe APIs

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available)

## Deployment

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
