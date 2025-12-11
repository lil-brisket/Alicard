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

**Option A: Using Docker (Recommended for local development)**

On Windows:
1. Install [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) and [Docker Desktop](https://docs.docker.com/docker-for-windows/install/)
2. Open WSL terminal: `wsl`
3. Navigate to project directory
4. Run: `./start-database.sh`

On Linux/macOS:
```bash
./start-database.sh
```

**Option B: Using Existing PostgreSQL**

Ensure your PostgreSQL server is running and update `DATABASE_URL` in `.env` with your connection string.

### 4. Run Database Migrations

```bash
npm run db:generate
```

This will:
- Generate Prisma Client
- Apply database migrations
- Create all necessary tables

### 5. Start Development Server

```bash
npm run dev
```

The game will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma Client and run migrations
- `npm run db:push` - Push schema changes to database (dev only)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

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
