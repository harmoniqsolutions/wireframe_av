# WireframeAV Agent Handoff

This file is the repo-level context handoff for future Codex/agent sessions. Treat it as the first thing to read before making changes.

## Product Vision

WireframeAV is a professional, cloud-based AV engineering documentation platform for AV integrators.

The product should let users create structured AV project documentation:

- Equipment lists
- Manufacturer product templates/stencils
- Professional schematic drawings
- Validated cable connections
- Auto-generated cable schedules
- Rack elevations
- Network diagrams and switch schedules
- Eventually polished 24x36 architectural-style PDF drawing packages

Long-term SaaS direction:

- Team organizations and collaboration
- Shared product libraries
- AI-assisted product stencil generation
- Project revisions/versioning
- Clerk authentication and organizations
- Stripe subscriptions
- Live collaboration, likely Liveblocks or similar
- Deployability on free-tier MVP stack such as Vercel Hobby plus Neon/Supabase Free Postgres

Important product philosophy:

**Drawings are visual representations of structured engineering data, not arbitrary shapes.** Every device, port, cable, rack item, and drawing object should map back to project data.

## Current Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Local shadcn-style UI primitives in `apps/web/components/ui`
- PostgreSQL
- Prisma ORM
- React Flow via `@xyflow/react`
- TanStack Table for cable schedule
- TanStack Query provider is installed for future server-state work
- Zustand for local editor UI state
- Docker Compose local Postgres

## Repo Layout

```text
apps/web
  app
  components/ui
  features
    cables
    devices
    products
    projects
    racks
    schematics
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

## Local Setup

Environment files:

- Root `.env` is ignored and used by Prisma CLI.
- `apps/web/.env.local` is ignored and used by Next dev server.
- Example files are committed:
  - `.env.example`
  - `apps/web/.env.example`

Default local database URL:

```bash
postgresql://postgres:postgres@localhost:5432/wireframe_av?schema=public
```

Useful commands:

```bash
npm install
npm run db:up
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
npm run typecheck
npm run lint
npm run build
```

Notes:

- `npm run db:up` starts Docker Compose Postgres.
- Prisma schema is in `packages/db/prisma/schema.prisma`.
- If changing Prisma models, run `npm run db:generate` and `npm run db:push`.
- When running `npm run build`, stop `next dev` and clear `apps/web/.next` if stale build-cache errors appear. This happened a few times when dev and build ran concurrently.

## GitHub

Remote:

```text
https://github.com/harmoniqsolutions/wireframe_av.git
```

Branch:

```text
main
```

Recent commits:

- `a673f96 Add agent project handoff`
- `67547f3 Add editable orthogonal schematic routing`
- `e3c878c Make schematic workspace fullscreen`
- `70ce8a2 Loosen connection validation and filter product library`
- `1d7a574 Improve AV workflow foundation`

GitHub CLI was authenticated as `harmoniqsolutions` and `gh auth setup-git` was run so pushes should work.

## Current Functional State

The app runs locally at:

```text
http://localhost:3000
```

Implemented pages/sections:

- Dashboard at `/`
- Product Library at `/library/products`
- Product detail/edit at `/library/products/[productId]`
- Project overview at `/projects/[projectId]`
- Equipment at `/projects/[projectId]/equipment`
- Schematics at `/projects/[projectId]/schematics`
- Cable Schedule at `/projects/[projectId]/cables`
- Racks placeholder at `/projects/[projectId]/racks`
- Network placeholder at `/projects/[projectId]/network`
- Settings at `/projects/[projectId]/settings`

The app is currently unauthenticated. `getCurrentContext()` in `apps/web/lib/context.ts` returns and upserts a default development user/org:

```ts
{
  userId: "dev-user-id",
  organizationId: "dev-org-id"
}
```

This is the future Clerk integration point. Do not scatter hardcoded user/org ownership elsewhere.

## Data Model Summary

Core models:

- `Organization`
- `User`
- `OrganizationMember`
- `Project`
- `ProjectLocation`
- `Manufacturer`
- `ConnectorType`
- `SignalType`
- `CableType`
- `ProductTemplate`
- `ProductPortTemplate`
- `DeviceInstance`
- `DevicePortInstance`
- `DrawingPage`
- `DrawingNode`
- `Cable`
- `DrawingEdge`
- `Rack`
- `RackMountedItem`
- `Revision`

Key architecture decisions:

- `ProductTemplate` and `ProductPortTemplate` are reusable manufacturer library definitions.
- `DeviceInstance` is an actual project device.
- When adding a device to a project, product port templates are copied into `DevicePortInstance` rows.
- Project device ports are snapshots. Editing a product template later should not mutate existing project device ports.
- `Cable` is the structured engineering connection and schedule source of truth.
- `DrawingEdge` is only the schematic visual representation of a `Cable`.
- `DrawingNode` is only the schematic visual placement of a `DeviceInstance`.

Recent schema addition:

- `DrawingEdge.routeOffsetX`
- `DrawingEdge.routeOffsetY`

These store manual cable route adjustments for the schematic editor.

## Seed Data

Seed script:

```text
packages/db/prisma/seed.ts
```

It creates:

- Default dev org/user
- Common connector types
- Common signal types
- Common cable types
- Generic manufacturer
- Sample product templates:
  - Generic DSP
  - Generic Amplifier
  - Generic Network Switch
  - Generic HDMI Display
  - Generic Wireless Microphone Receiver

The user plans to have another chatbot generate a Biamp equipment list to add to the database/library. Expect future work to import or seed more manufacturer product templates and ports. The UI now includes product library filters so a bigger library stays usable.

## Product Library Status

Product Library supports:

- Create/edit `ProductTemplate`
- Manufacturer creation by name
- Model
- Display name
- Category
- Rack units
- Notes
- Verification status
- Product filters by search, manufacturer, category, verification status

Product port editor supports:

- Name
- Connector type
- Signal type
- Direction
- Side
- Sort order
- Notes
- Bulk numbered port creation with `quantity`

Important next opportunities:

- Import/seed robust manufacturer equipment libraries, starting with Biamp.
- Add product template duplicate/copy.
- Add product port bulk edit and better grouped port display.
- Add verification metadata and provenance for AI/admin/user verified templates.

## Project Equipment Status

Equipment page supports:

- List devices
- Add device from product library
- Filter product templates by search, manufacturer, category before adding
- Select location
- Enter tag, display name, notes
- Tag is normalized to uppercase
- Device creation snapshots all current template ports to `DevicePortInstance`

Professional tag prefixes shown in UI:

```text
DSP, AMP, SW, DISP, MIC, RX, TX, CAM, SPK
```

Important next opportunities:

- Better tag numbering helper, e.g. auto-suggest next `DSP-001`.
- Device edit form.
- Bulk add devices.
- Location-aware summaries.

## Schematics Status

The schematic editor uses React Flow.

Implemented:

- Multiple drawing pages per project
- Page selection
- Create drawing page
- Add project devices to active page
- Device nodes are rectangular engineering-style blocks
- Ports render as handles
- Connect handles to create `Cable` and `DrawingEdge`
- Invalid connections show message and are rejected
- Node positions persist
- Edges are rendered from `DrawingEdge`/`Cable`
- Deleting a schematic edge deletes the linked `Cable`
- Canvas fills the available workspace
- Fullscreen button inside canvas
- Device sidebar scrolls independently
- Edges are orthogonal vertical/horizontal routes with rounded corners
- Edge route handle can be dragged to adjust route
- Route adjustment persists to `DrawingEdge.routeOffsetX/Y`
- Port handles only render on LEFT and RIGHT sides (FRONT maps to LEFT, REAR maps to RIGHT); TOP and BOTTOM ports are excluded from the canvas — underlying port data is unchanged

Important files:

- `apps/web/features/schematics/schematic-canvas.tsx`
- `apps/web/features/schematics/device-node.tsx`
- `apps/web/features/schematics/editable-step-edge.tsx`
- `apps/web/app/api/drawing-pages/[drawingPageId]/connections/route.ts`
- `apps/web/app/api/drawing-pages/[drawingPageId]/nodes/route.ts`
- `apps/web/app/api/drawing-edges/[drawingEdgeId]/route.ts`

UX improvements landed (2026-05-03):

- Route handle and reset button now only visible when an edge is selected or hovered — reduces visual clutter on busy schematics.
- “reset” button appears below the drag handle when a route offset is non-zero, zeroes routeOffset and persists via PATCH.
- Cable number label opacity is reduced (0.55) when edge is not active, full opacity + stronger border/color when selected.
- Status messages (connection accepted/rejected, cable removed) auto-dismiss after 3 seconds.

Known current UX limitation:

- Manual route control is a single offset/control handle per edge. This is a good MVP but not full multi-segment routing yet.
- Edge deletion currently deletes the cable. That matches current MVP but may need confirmation UI or soft-delete later.

## Connection Validation Status

Validation package:

```text
packages/validation/src/connectionValidation.ts
```

Result shape:

```ts
type ConnectionValidationResult = {
  allowed: boolean;
  severity: "success" | "warning" | "error";
  message: string;
};
```

Rules:

- A port cannot connect to itself.
- A device cannot connect to itself by default.
- Direction rules are enforced:
  - OUTPUT to INPUT allowed
  - INPUT to OUTPUT allowed and normalized when creating the cable
  - INPUT to INPUT blocked
  - OUTPUT to OUTPUT blocked
  - BIDIRECTIONAL can connect to compatible directions
- Exact connector/signal matches return success.
- Known field-terminable connector pairs are allowed with warning, e.g.
  - XLR 3-pin to 3-pin Euroblock
  - XLR 5-pin to 5-pin Euroblock
  - 1/4 inch TRS to 3-pin Euroblock
  - RCA to 3-pin Euroblock
  - DB9 to Euroblock
- Related signal groups can connect with warning, e.g.
  - Network Data, Dante/AES67, AV-over-IP
  - Analog Audio Balanced, Digital Audio AES3
  - RS-232 Control, RS-485 Control, GPIO
- Unknown connector mismatch is currently allowed with warning as adapter/custom cable. This was intentional to make the MVP less strict for real AV practice.

Important next opportunities:

- Add an explicit `ConnectionCompatibilityRule` database table instead of hardcoding compatibility lists.
- Add per-project/team override policy.
- Add cable termination/pinout notes when mismatch warning is accepted.
- Add "requires adapter/custom termination" flags on Cable.

## Cable Schedule Status

Cable schedule uses TanStack Table.

Implemented:

- Auto-generated cable numbers `C-0001`, `C-0002`, etc.
- Source/destination device and port names
- Cable type, connectors, locations, length, status, notes
- Inline edits for cable type, estimated length, status, notes
- CSV export route

Cable creation currently infers common cable types:

- RJ45 + Network/Dante/AV-over-IP -> CAT6A
- HDMI Type A + HDMI Video -> HDMI
- BNC + SDI Video -> SDI Coax
- Euroblock/XLR 3-pin + balanced audio -> Balanced Audio Cable
- NL2/NL4 + speaker level -> Speaker Cable 12/2
- USB connectors + USB -> USB Cable
- Fiber connectors + Fiber -> Duplex Fiber
- IEC/NEMA + AC Power -> AC Power Cable

Important next opportunities:

- Add cable label export.
- Add cable schedule filters/grouping.
- Better cable number configuration.
- Add termination and adapter metadata.

## Layout / UX Status

Recent layout direction:

- The app now behaves more like a fullscreen professional workspace.
- Root layout is `h-screen` with a persistent top header.
- Project layout fills full window width/height with a left project nav.
- Schematic editor fills remaining viewport and supports browser fullscreen.

Design preferences:

- Keep neutral, technical styling.
- Avoid colorful/toy-like blocks.
- Prefer dense but readable tables.
- Avoid marketing/landing-page treatment.
- Schematic nodes should feel like clean engineering blocks.

## Rack Elevations Status

Implemented:

- Create and delete racks per project (name, height in RU, numbering direction)
- Drag devices from sidebar into RU slots on the rack elevation canvas
- Drag placed devices to reposition within the rack
- Remove devices from the rack via X button
- Front/rear view toggle — each side maintains independent mounted items
- Client-side and server-side overlap/conflict detection
- Optimistic local state updates with rollback on API error
- `BOTTOM_UP` (RU 1 at bottom) and `TOP_DOWN` (RU 1 at top) numbering directions
- `rackUnits` from `ProductTemplate` auto-sets device height; defaults to 1U if unset
- Status messages auto-dismiss after 3 seconds

Important files:

- `apps/web/features/racks/rack-canvas.tsx`
- `apps/web/features/racks/actions.ts`
- `apps/web/app/api/racks/[rackId]/items/route.ts`
- `apps/web/app/api/rack-items/[itemId]/route.ts`

Important next opportunities:

- Rack power/weight totals using `ProductTemplate.powerWatts`
- Space utilization indicator (used RU / total RU)
- Rack PDF/print export
- Display rack location and link to project locations
- Consider drag image customization for clearer multi-RU device ghost

## Placeholder Features

Network diagrams:

- Route exists.
- Placeholder says this will become focused network drawing and switch-port schedule view.
- Network can currently be represented as schematic pages and signal types.

PDF export:

- Not implemented.
- Future likely Playwright/Puppeteer for 24x36 drawing packages.

Authentication:

- Not implemented.
- Prepare for Clerk via `getCurrentContext()`.

Billing/collaboration/AI:

- Not implemented.
- Do not add yet unless foundation is ready.

## Deployment Notes

Target MVP deploy stack:

- Vercel Hobby for `apps/web`
- Neon or Supabase Free Postgres

Keep this in mind:

- No local-only dependencies in runtime path.
- `DATABASE_URL` must be configured in hosting env.
- Prisma Client generation should work during build.
- Dynamic DB-backed routes currently use `export const dynamic = "force-dynamic"`.

## Current Verification Practices

Before committing, run:

```bash
npm run typecheck
npm run lint
npm run build
```

If schema changed:

```bash
npm run db:generate
npm run db:push
```

For local sanity:

```bash
curl -I http://localhost:3000/
```

The repo currently uses `prisma db push` rather than migrations. For production, switch to migrations before serious deployment.

## Recommended Near-Term Roadmap

High-value next passes:

1. Import/seed Biamp product templates and ports.
2. Create a structured equipment import format, likely JSON or CSV, so AI-generated manufacturer data can be reviewed and imported.
3. Move hardcoded connector/signal compatibility into data-driven rules.
4. Add custom termination metadata to cables for XLR-to-Euroblock and similar field wiring.
5. Add tag auto-numbering and device edit forms.
6. Improve schematic route UX:
   - Reset route
   - Multi-bend route points
   - Better selection affordances
   - Edge label placement control
7. ~~Add rack elevation MVP using existing `Rack` and `RackMountedItem`.~~ Done.
8. Add project revisions and changelog snapshots.
9. Prepare deployment configuration for Vercel + Neon/Supabase.

## Agent Working Guidelines

- Do not rewrite working code without need.
- Keep the data model and structured engineering source of truth central.
- Prefer small vertical improvements that leave the app runnable.
- When adding visual features, persist meaningful structured state rather than storing canvas-only ephemera.
- Be careful not to commit `.env`, `.env.local`, `.next`, or `node_modules`.
- The user is actively iterating and may run another chatbot to generate product data. Check `git status` before editing and preserve any user/other-agent changes.
