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
- `DrawingEdge.manualWaypoints`

These store manual cable route adjustments for the schematic editor. `routeOffsetX/Y` are legacy/simple route offsets; `manualWaypoints` stores the current EasySchematic-style user-added route handles as JSON points.

## Seed Data

Seed script:

```text
packages/db/prisma/seed.ts
```

It creates:

- Default dev org/user
- Common connector types (including DM 8G, 3-pin IR, Cresnet 4-pin)
- Common signal types (including DigitalMedia (DM), IR Control, Cresnet)
- Common cable types
- Generic manufacturer + sample product templates:
  - Generic DSP
  - Generic Amplifier
  - Generic Network Switch
  - Generic HDMI Display
  - Generic Wireless Microphone Receiver
- Crestron manufacturer (website linked) + 4 product templates (status: `AI_DRAFT`, sourced from EasySchematic open-source library):
  - CP4N — 4-Series Control Processor (1U rack)
  - DM-NVX-351 — AV-over-IP encoder/decoder
  - DM-MD8X8-CPU3 — 8×8 modular matrix switcher (4U)
  - DM-MD16X16-CPU3 — 16×16 modular matrix switcher (7U)

Expect future work to import or seed more manufacturer product templates and ports. The UI now includes product library filters so a bigger library stays usable. The EasySchematic open-source repo (https://github.com/duremovich/EasySchematic) was evaluated as a data source — it has only 4 Crestron devices total.

**IMPORTANT — Product Data Accuracy Policy:**
Do NOT guess or hallucinate product specifications. All field values (dimensions, weight, power, port counts, connector types, referenceUrl, etc.) must be taken directly from the manufacturer's official website or published datasheets. If a spec cannot be confirmed from a primary source, leave the field null rather than approximate it. The `verificationStatus` field communicates provenance: use `AI_DRAFT` only when the data was sourced from a structured third-party dataset (e.g. EasySchematic), and flag anything unverified for human review.

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

`ProductTemplate` schema fields (as of 2026-05-03):

| Field | Type | Notes |
|---|---|---|
| `rackUnits` | `Int?` | Rack height in U |
| `widthInches` | `Float?` | Chassis width |
| `depthInches` | `Float?` | Chassis depth |
| `heightInches` | `Float?` | Chassis height (use for non-rack items) |
| `weightLbs` | `Float?` | Weight in lbs (US AV industry standard) |
| `powerWatts` | `Float?` | Typical power consumption |
| `thermalBtuH` | `Float?` | Manual override; derive as `powerWatts * 3.412` if null |
| `poeBudgetW` | `Float?` | PoE supply capacity (switches/injectors) |
| `poeDrawW` | `Float?` | PoE draw (powered devices) |
| `unitCostUsd` | `Float?` | Unit cost for budget estimation |
| `referenceUrl` | `String?` | Manufacturer product page URL |
| `imageUrl` | `String?` | Product image URL |

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

- Import/seed robust manufacturer equipment libraries (Biamp, QSC, Extron, etc.) using AI-generated data.
- Expose new `ProductTemplate` fields (weight, dimensions, power, cost, referenceUrl) in the product library UI and rack elevation totals.
- Add product template duplicate/copy.
- Add product port bulk edit and better grouped port display.
- Add verification metadata and provenance for AI/admin/user verified templates.

## Project Equipment Status

Equipment page supports:

- List devices
- Add device from product library
- Filter project equipment by location and category
- Filter product templates by search, manufacturer, category before adding
- Dropdown filters submit instantly when changed; no separate Apply button
- Select location
- Enter tag, display name, notes
- Tag is normalized to uppercase
- Device creation snapshots all current template ports to `DevicePortInstance`
- Open an already-added equipment item at `/projects/[projectId]/equipment/[deviceInstanceId]`
- Edit equipment tag, display name, location, and notes
- Add, edit, and delete project-specific snapshot ports on existing equipment
- Device port edits detach the snapshot from the original `ProductPortTemplate` by clearing `productPortTemplateId`
- Deleting a device or project-specific port deletes connected `Cable` rows first, which cascades linked schematic `DrawingEdge` rows

Professional tag prefixes shown in UI:

```text
DSP, AMP, SW, DISP, MIC, RX, TX, CAM, SPK
```

Important files:

- `apps/web/app/projects/[projectId]/equipment/page.tsx`
- `apps/web/app/projects/[projectId]/equipment/[deviceInstanceId]/page.tsx`
- `apps/web/features/devices/actions.ts`
- `apps/web/components/ui/auto-submit-select.tsx`

Important next opportunities:

- Better tag numbering helper, e.g. auto-suggest next `DSP-001`.
- Bulk add devices.
- Location-aware summaries and grouped equipment views.
- Confirmation UI before deleting equipment, ports, or connected cables.

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
- Default edge routes have no visible edit handle
- Right-clicking an edge opens a context menu with add route handle, remove nearest handle, reset route, and delete cable actions
- User-added edge route handles can be dragged to create multi-bend orthogonal cable routes
- Route handle dragging uses pointer events/pointer capture on the SVG waypoint controls, so React Flow pan/drag handling does not swallow the interaction
- Route handles persist to `DrawingEdge.manualWaypoints`
- Automatic routes prefer the minimum number of orthogonal bends, then shorter path length
- Automatic routes avoid other device blocks using obstacle rectangles derived from the rendered device node dimensions
- Legacy/simple route adjustment still supports `DrawingEdge.routeOffsetX/Y`
- Right-clicking a device opens a context menu with reset connected routes, fit drawing, and remove from page actions
- Removing a device from a schematic page deletes its connected page cables and drawing edges
- Switching drawing pages now resets React Flow local state from server props, so manual browser refresh is no longer required after page changes
- Schematic ports and cable edges are color-coded by signal type
- Project device sidebar has search/filtering
- Port handles only render on LEFT and RIGHT sides (FRONT maps to LEFT, REAR maps to RIGHT); TOP and BOTTOM ports are excluded from the canvas — underlying port data is unchanged

Important files:

- `apps/web/features/schematics/schematic-canvas.tsx`
- `apps/web/features/schematics/device-node.tsx`
- `apps/web/features/schematics/editable-step-edge.tsx`
- `apps/web/features/schematics/routing-utils.ts`
- `apps/web/app/api/drawing-pages/[drawingPageId]/connections/route.ts`
- `apps/web/app/api/drawing-pages/[drawingPageId]/nodes/route.ts`
- `apps/web/app/api/drawing-edges/[drawingEdgeId]/route.ts`
- `apps/web/app/api/drawing-nodes/[drawingNodeId]/route.ts`

UX improvements landed (2026-05-03):

- Route handle and reset button now only visible when an edge is selected or hovered — reduces visual clutter on busy schematics.
- “reset” button appears below the drag handle when a route offset is non-zero, zeroes routeOffset and persists via PATCH.
- Cable number label opacity is reduced (0.55) when edge is not active, full opacity + stronger border/color when selected.
- Status messages (connection accepted/rejected, cable removed) auto-dismiss after 3 seconds.

UX improvements landed (2026-05-04):

- Inspired by EasySchematic, cable editing now uses right-click-added manual handles instead of always showing a default drag handle.
- Edge context menu can add a manual route handle at the clicked cable segment, remove the nearest manual handle, reset the route, or delete the cable.
- Manual route handles are persisted as `DrawingEdge.manualWaypoints`; the API validates and stores the point array via PATCH.
- Edge routes use horizontal port stubs and orthogonal point simplification in `routing-utils.ts`.
- Edge route handle dragging was fixed by switching the waypoint controls from mouse-only handlers to pointer events with pointer capture.
- Default automatic edge routes now run through an obstacle-aware orthogonal router that favors fewer bends before shorter distance and avoids other schematic device blocks.
- Device node dimensions are exposed from `device-node.tsx` and reused by `schematic-canvas.tsx` so routing obstacles match rendered block sizes.
- Device context menu supports reset connected routes, fit drawing, and remove from page.
- Page switching bug fixed by resyncing React Flow node/edge state when `drawingPageId` changes.
- Signal metadata is passed through the diagram mapper so port handles/labels and edges can be color-coded by signal type.

Known current UX limitation:

- Edge deletion currently deletes the cable. That matches current MVP but may need confirmation UI or soft-delete later.
- Manual waypoint routing still trusts the user's chosen waypoints and does not automatically reroute around blocks once a manual handle exists.
- Automatic obstacle routing is grid/candidate-line based rather than full A*; EasySchematic's A* router is still a strong reference for a future deeper pass.
- Edge label placement is still automatic near the route midpoint; explicit label handles/control are not implemented yet.

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

- Rack power/weight totals using `ProductTemplate.powerWatts` and `ProductTemplate.weightLbs`
- Rack thermal load summary using `thermalBtuH` (or derived from `powerWatts * 3.412`)
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

1. ~~Import/seed initial Crestron product templates.~~ Done (4 devices: CP4N, DM-NVX-351, DM-MD8X8-CPU3, DM-MD16X16-CPU3).
2. Import/seed Biamp product templates and ports — specs must come from Biamp's official website/datasheets, not guessed.
3. Create a structured equipment import format, likely JSON or CSV, so manufacturer data can be reviewed and imported before seeding.
4. Move hardcoded connector/signal compatibility into data-driven rules.
5. Add custom termination metadata to cables for XLR-to-Euroblock and similar field wiring.
6. Add tag auto-numbering and device edit forms.
7. Expose new ProductTemplate fields (referenceUrl, weightLbs, powerWatts, unitCostUsd) in product library UI.
8. Improve schematic route UX:
   - Full obstacle-aware A* routing inspired by EasySchematic
   - Line jump arcs at cable crossings
   - Better selection affordances
   - Edge label placement control
9. ~~Add rack elevation MVP using existing `Rack` and `RackMountedItem`.~~ Done.
10. Add project revisions and changelog snapshots.
11. Prepare deployment configuration for Vercel + Neon/Supabase.

## Agent Working Guidelines

- Do not rewrite working code without need.
- Keep the data model and structured engineering source of truth central.
- Prefer small vertical improvements that leave the app runnable.
- When adding visual features, persist meaningful structured state rather than storing canvas-only ephemera.
- Be careful not to commit `.env`, `.env.local`, `.next`, or `node_modules`.
- The user is actively iterating and may run another chatbot to generate product data. Check `git status` before editing and preserve any user/other-agent changes.
