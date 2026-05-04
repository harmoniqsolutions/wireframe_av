# Wireframe AV

Professional AV schematic and engineering documentation SaaS foundation.

The MVP treats drawings as visual views over structured project data:

- Product templates define reusable manufacturer gear and port templates.
- Device instances snapshot template ports into project-specific ports.
- Drawing nodes place devices on schematic pages.
- Valid React Flow connections create structured cable records and drawing edges.
- Cable schedules are generated from those records and export as CSV.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- shadcn-style local UI primitives
- PostgreSQL, Prisma ORM
- React Flow for schematic canvas
- TanStack Query provider for server-state foundation
- Zustand for editor UI state
- TanStack Table for cable schedule editing

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment files:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Start PostgreSQL and update `DATABASE_URL` if needed.

   ```bash
   npm run db:up
   ```

4. Generate Prisma Client and push the schema:

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. Seed connector, signal, cable types, development ownership, and generic demo templates:

   ```bash
   npm run db:seed
   ```

6. Run the app:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

## MVP Workflow

1. Create or use the seeded product templates.
2. Add `DSP-001` and `AMP-001` to a project from the product library.
3. Create an Audio schematic page.
4. Add both devices to the page from the schematic sidebar.
5. Connect `DSP-001 Output 1` to `AMP-001 Input 1`.
6. Confirm `C-0001` appears in the cable schedule.
7. Export the cable schedule as CSV.

## Auth Preparation

Authentication is intentionally not required yet. All ownership-aware creation flows call `getCurrentContext()` in `apps/web/lib/context.ts`, which currently returns a default development user and organization. That function is the future Clerk integration point.

## Structure

```text
apps/web
  app
  components/ui
  features
  lib
  stores
packages/db
  prisma/schema.prisma
  prisma/seed.ts
  src/client.ts
packages/shared
packages/validation
packages/export
packages/diagram
```

## Future Extension Points

The database already reserves structures for rack elevations and revisions. The codebase keeps PDF export, AI stencil generation, collaboration, Clerk organizations, billing, cable labels, and switch schedules out of the MVP while leaving clean package boundaries for them.
