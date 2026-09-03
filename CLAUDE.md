# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based character sheet generator for the DaggerHeart tabletop RPG system by Critical Role. The application allows users to create, edit, and manage DaggerHeart characters with an interactive digital character sheet interface.

## Development Commands

```bash
# Development server
pnpm dev

# Build for production (GitHub Pages)
pnpm build

# Build for local deployment
pnpm build:local

# Start production server
pnpm start

# Linting
pnpm lint

# Testing
pnpm test          # Run tests in watch mode
pnpm test:run      # Run tests once
pnpm test:ui       # Run tests with UI
pnpm test:coverage # Run tests with coverage
pnpm test:unit     # Run only unit tests
pnpm test:integration # Run only integration tests
```

## Key Architecture Components

### State Management

- **Zustand stores** for state management:
  - `lib/sheet-store.ts` - Main character sheet data and actions
  - `card/stores/unified-card-store.ts` - Unified card management system
  - `lib/multi-character-storage.ts` - Multiple character persistence
  - `lib/pinned-cards-store.ts` - Card pinning functionality

### Card System

- **Card types** defined in `card/card-types.ts`:
  - Standard card types: Profession, Ancestry, Community, Subclass, Domain
  - Variant cards for custom content
  - Card validation and processing utilities
- **Card converters** in `card/*/convert.ts` files transform raw card data into StandardCard format
- **Unified card system** manages both built-in and custom imported cards

### Component Structure

- **Character Sheet sections** in `components/character-sheet-sections/` for different parts of the sheet
- **Modals** in `components/modals/` for card selection and character management
- **UI components** in `components/ui/` using Radix UI primitives with Tailwind CSS
- **Print system** with dedicated print context and components

### Data Management

- **Local storage** for character data persistence
- **Import/Export system** for custom card batches in JSON format
- **Character data validation** with Zod schemas
- **Default data** structures in `lib/default-sheet-data.ts`

### Ruleset Architecture

- `lib/rulesets/registry.ts` is the shared entry point for ruleset modules; definitions live under `lib/rulesets/daggerheart/` and `lib/rulesets/rhodes-island/`.
- Read `docs/architecture/rulesets.md` before adding ruleset behavior, fields, migrations, card indexing, or export handling.
- Shared UI must use registry capabilities, policies, labels, and layout. Do not add bare functional `ruleSetId === "..."` branches there; per-card layout based on the card's own ruleset is the narrow exception.

## Build Configuration

- **Next.js** with static export (`output: 'export'`)
- **Multiple deployment targets**:
  - GitHub Pages (with `assetPrefix` and `basePath`)
  - Local builds (relative paths)
- **TypeScript and ESLint** errors ignored during builds for rapid development

## Testing Setup

- **Vitest** for unit and integration testing
- **Testing Library** for React component testing
- **Happy DOM** for browser environment simulation
- Test files organized in `tests/unit/` and `tests/integration/`
- Fast required gates: `pnpm exec tsc --noEmit` and `pnpm test:review-gates`
- Full verification: `pnpm test:run -- --reporter=dot` followed by `pnpm build`
- For ruleset changes, cover registry/defaults, migration and recent-save recovery, finalization, capabilities/pages, card isolation/order, exports, and print layout as described in `docs/architecture/rulesets.md`.

## Important Notes

- The application supports both Chinese and English content
- Custom card imports are handled through the unified card store
- Character sheet has special card slot protections (first 5 slots in focused deck)
- Print functionality includes image loading optimization
- The project uses PNPM as the package manager

## Development Workflow Guidelines

### NEVER Start the Development Server Automatically

**CRITICAL RULE**: Claude Code should **NEVER** automatically start the development server (`pnpm dev`) or any other long-running background processes without explicit user request.

**Reasons**:

- The user manages their own development environment
- Starting servers automatically can interfere with existing processes
- The user will start the server when they're ready to test
- Prevents unnecessary resource consumption

**What to do instead**:

- Complete code changes first
- Update todo list to mark tasks as completed
- Inform the user that changes are ready for testing
- Let the user decide when to start the server

**Example**:

```
❌ DON'T: "Let me start the dev server to test..."
✅ DO: "Changes are complete. You can test by running `pnpm dev` when ready."
```

## SheetData Flow and Migration

### SheetData Sources

SheetData can come from multiple sources in the application:

1. **New Character Creation**
   - `lib/multi-character-storage.ts` - `createNewCharacter()` calls `createDefaultSheetData(ruleSetId)`
   - `lib/default-sheet-data.ts` - Factory creates independent nested state for every character

2. **Loading from Storage**
   - `lib/multi-character-storage.ts` - `loadCharacterById()` loads from localStorage
   - `lib/sheet-data-migration.ts` - `migrateSheetData()` centralizes structural and historical-field migration

3. **Character Duplication**
   - `lib/multi-character-storage.ts` - `duplicateCharacter()` copies existing character data

4. **JSON Import**
   - `lib/character-data-validator.ts` validates and migrates imported JSON before it enters the sheet store

5. **HTML Import**
   - `lib/html-importer.ts` - `importCharacterFromHTMLFile()` extracts from HTML
   - Uses `validateAndProcessCharacterData()` for validation

6. **Legacy Migration**
   - `lib/multi-character-storage.ts` - `migrateToMultiCharacterStorage()` migrates from old single-character system

### Existing Migration Pattern

- `migrateSheetData()` is the single structural migration pipeline used by storage loads and validated imports.
- It normalizes the ruleset first, overlays a fresh `createDefaultSheetData(ruleSetId)`, applies field migrations in dependency order, and removes deprecated fields.
- `replaceSheetData()` is used for whole-sheet load/switch operations; current JSON and HTML imports use `setSheetData()` after validation. Both paths run `finalizeSheetData()`.
- Ruleset calculations belong in the active module's normalization hook, not in migration branches.

### Adding New Fields Migration Strategy

When adding new fields to SheetData:

1. **Update `lib/sheet-data.ts`** - Add the new field to the SheetData interface
2. **Update `lib/default-sheet-data.ts`** - Add a fresh default value inside the factory
3. **Update `migrateSheetData()`** - Add compatibility handling in the centralized migration pipeline
4. **Update validation** if the field needs input cleaning or schema checks
5. **Add load/import/default-isolation tests** and ruleset-specific finalization tests where applicable

### Migration Testing Points

- Load existing characters without new field
- Import old JSON files
- Import HTML files
- Duplicate existing characters
- Create new characters

## Page Layout System

### A4 Page Layout Standards

All pages follow a consistent A4 paper layout pattern for print compatibility:

```typescript
// Standard page container structure
<div className="w-full max-w-[210mm] mx-auto">
  <div
    className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
    style={{ width: "210mm" }}
  >
    <PageHeader />
    {/* Page content */}
  </div>
</div>
```

**Key Layout Elements:**

- **Outer container**: `w-full max-w-[210mm] mx-auto` - Centers page with A4 max-width
- **Page body**: `a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md`
- **Fixed width**: `style={{ width: "210mm" }}` - Ensures strict A4 paper width
- **Print optimization**: `print:shadow-none` removes shadows when printing

### Design Language Standards

All pages maintain visual consistency through:

- **Color scheme**: White background + gray text (`bg-white text-gray-800`)
- **Visual effects**: Shadow (`shadow-lg`) + rounded corners (`rounded-md`)
- **Spacing**: Standard padding (`p-2`)
- **Print compatibility**: Automatic style adjustments for print media

### Page Registration System

Pages are declared in `components/layout/character-sheet-pages.ts` and registered once by `app/page.tsx`:

```typescript
export const CHARACTER_SHEET_PAGES: PageDefinition[] = [
  {
    id: "page1", // Unique identifier
    label: "第一页", // Display label in tabs
    component: CharacterSheet, // React component
    printClass: "page-one", // CSS class for print styles
    visibility: { type: "always" }, // Visibility rules
    printOrder: 1, // Order in print output
    showInTabs: true, // Show in tab navigation
  },
];
```

### Page Visibility Control

Three types of visibility rules:

`PageDefinition.ruleSetIds` is an optional ruleset allowlist checked before these visibility rules.

1. **Always visible** (`type: 'always'`)
   - Pages that should always be shown (e.g., main character sheet pages)

2. **Config-based** (`type: 'config'`)
   - Pages shown based on user configuration
   - Uses `configKey` to check against user settings
   - Example: Ranger Companion page, Iknis Armor page

3. **Data-based** (`type: 'data'`)
   - Pages shown when specific data conditions are met
   - Uses `dataCheck` function to evaluate character data
   - Example: Card deck pages only show when cards are present

### Page Navigation System

**Tab System:**

- Dynamic tab generation based on visibility rules
- Responsive layout with overflow scrolling on mobile
- Page management dropdown for toggling page visibility

**Keyboard Shortcuts:**

- `←` `→` Arrow keys: Cycle through pages
- `1` `2` `3` ... Number keys: Jump directly to pages
- `Ctrl + 1-9/0`: Switch between character saves
- `ESC`: Exit print preview mode

### Requirements for New Pages

When creating a new page component:

1. **Layout Structure**: Must use the standard A4 layout container
2. **Component Format**: React component following existing patterns
3. **Page Registration**: Add an entry to `CHARACTER_SHEET_PAGES`
4. **Visibility Rules**: Define appropriate visibility conditions
5. **Print Styles**: Specify `printClass` for print-specific styling
6. **Design Consistency**: Follow the established design language
7. **Header Component**: Use `<PageHeader />` for consistent page tops

### Example Page Implementation

```typescript
// components/my-new-page.tsx
export default function MyNewPage() {
  return (
    <>
      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          <PageHeader />
          {/* Your page content here */}
        </div>
      </div>
    </>
  )
}

// In components/layout/character-sheet-pages.ts
{
  id: 'my-new-page',
  label: '我的新页面',
  component: MyNewPage,
  printClass: 'page-my-new',
  visibility: { type: 'config', configKey: 'myNewFeature' },
  printOrder: 6,
  showInTabs: true
}
```

This system ensures all pages maintain consistent layout, navigation, and user experience while allowing for flexible content and visibility management.
