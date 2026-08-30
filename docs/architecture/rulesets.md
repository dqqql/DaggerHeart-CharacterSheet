# Ruleset architecture

The application supports Daggerheart SRD (`daggerheart`) and Rhodes Island (`rhodes-island`) in one Next.js application, one Zustand sheet store, and one persisted character shape. Ruleset modules provide differences at explicit extension points; they are not separate applications or separate data models.

## Registry and definitions

`lib/rulesets/types.ts` defines the stable `RuleSetModule` contract. `lib/rulesets/registry.ts` is the only mapping from a `RuleSetId` to a module and exposes `getRuleSetModule()` plus labels derived from the registered modules.

The two definitions own their ruleset's metadata and implementations:

- `lib/rulesets/daggerheart/definition.ts` defines the SRD label, capabilities, labels, layout, armor catalog, card-batch/domain policies, and identity normalization/export hooks.
- `lib/rulesets/rhodes-island/definition.ts` defines the Rhodes Island equivalents and composes the focused implementations in `lib/rulesets/rhodes-island/automation.ts`, `derived-stats.ts`, `domain-filter.ts`, and `experience.ts`.
- `lib/rulesets/rhodes-island/card-display.ts` owns Rhodes-specific card text presentation. Ruleset-only React UI belongs under `components/rulesets/`, such as `rhodes-island-module-upgrade.tsx`.

`lib/ruleset.ts` remains a narrow compatibility module for card ruleset classification and existing label/helper callers. New ruleset behavior should use the registry contract, not add more compatibility exports.

## Choosing an extension point

Put a new difference in the smallest existing extension point that describes it:

- Use a lifecycle hook when sheet data must change at an established boundary: `normalizeSheetData` for edit/load replacement finalization and `prepareForExport` for export-only materialization.
- Use a capability when shared UI only needs to know whether a feature exists, for example `mixedAncestry`, `secondaryWeapon`, `guide`, or `printPreview`.
- Use a policy method when both rulesets perform the same operation with different values or algorithms, for example derived-stat sources, armor catalogs, profession Hope features, card batches, or domain filter ordering.
- Use `labels` for ruleset terminology and `layout` for shared component layout choices.

Do not add a new bare functional branch such as `ruleSetId === "..."` in shared UI. Add or extend a hook, capability, policy, label, or layout field and query it through `getRuleSetModule()`. A local branch is legitimate when rendering the physical layout of an individual card from that card's own ruleset tag (for example image aspect, fit, or icon treatment in `components/ui/image-card.tsx`); it must not become a sheet-level feature switch.

## Shared layer and ruleset ownership

The shared layer owns orchestration and storage: `lib/sheet-store.ts`, `lib/sheet-finalization.ts`, `lib/sheet-data-migration.ts`, `lib/multi-character-storage.ts`, page registration, export handlers, and the unified card store. These files may depend on `lib/rulesets/types.ts` or `lib/rulesets/registry.ts`, but should not import a concrete ruleset implementation to decide shared behavior.

A ruleset module owns rule calculations, defaults that are applied by its hooks, catalog selection, ruleset terminology, feature availability, and ruleset-specific presentation helpers. Concrete Rhodes Island logic stays in `lib/rulesets/rhodes-island/`; concrete SRD logic stays in `lib/rulesets/daggerheart/`.

`SheetData` intentionally remains one compatibility structure in `lib/sheet-data.ts`. It is not a discriminated union because old JSON, HTML, and localStorage records share field names and may omit fields added later; the app also edits, migrates, duplicates, saves, and exports both rulesets through one store and one persistence pipeline. Optional ruleset-specific fields preserve those records without changing storage keys or forcing destructive schema conversion. The required `ruleSetId` is normalized at boundaries, while `CharacterMetadata.ruleSetId` remains optional only for historical metadata compatibility.

## Finalization order

Every normal sheet edit through `setSheetData` and every whole-sheet replacement through `replaceSheetData` reaches `finalizeSheetData()` in `lib/sheet-finalization.ts`. Its order is fixed:

1. `syncSubclassSpellcasting()` clears the old subclass spellcasting marker and applies the new one.
2. `getRuleSetModule(ruleSetId).normalizeSheetData()` applies ruleset automation.
3. `syncDerivedCombatStats()` calculates evasion, armor value, armor maximum, and damage thresholds while honoring explicit clears.

Do not reorder these stages. Ruleset automation must see the updated subclass state, and shared derived calculations must see the normalized ruleset data.

Migration is not a replacement for finalization. `migrateSheetData()` repairs persisted structure and historical fields; `replaceSheetData()` then finalizes the migrated or imported result when it enters the live store.

## Character data flow

### Default creation

`createDefaultSheetData(ruleSetId)` in `lib/default-sheet-data.ts` creates fresh nested arrays and objects for the selected ruleset. `createNewCharacter()` in `lib/multi-character-storage.ts` uses that factory, then the character-management hook creates metadata and writes the initial payload with `saveCharacterById()`. Never shallow-copy `defaultSheetData` for a new mutable character.

### Load and migration

On startup, `hooks/use-character-management.ts` first runs legacy multi-character migration, recovers metadata when possible, and selects the active save for the active ruleset. `loadCharacterById()` reads `dh_character_<id>`, uses metadata as a ruleset fallback only when the payload has no `ruleSetId`, and runs `migrateSheetData()`. Migration normalizes unknown/missing IDs to `daggerheart`, overlays `createDefaultSheetData(ruleSetId)`, applies field migrations in dependency order, and removes deprecated fields. If serialization changed, the migrated payload is written back. `replaceSheetData()` then puts it into Zustand and runs finalization.

JSON import uses `validateJSONCharacterData()` / `validateAndProcessCharacterData()` in `lib/character-data-validator.ts`; HTML import extracts `window.characterData` in `lib/html-importer.ts` and uses the same validator. Validation cleans data, merges compatibility defaults, and runs `migrateSheetData()`. `app/page.tsx` rejects an import whose ruleset differs from the active ruleset, creates a save, and replaces the live sheet; the autosave bridge persists subsequent edits.

### Save and export

`lib/sheet-auto-save-bridge.ts` debounces ordinary sheet edits and deliberately cancels pending writes on whole-sheet generation changes such as load, switch, or import. `hooks/use-sheet-auto-save.ts` resolves the active character for the sheet's ruleset and calls `saveCharacterById()`. That save entry normalizes only `ruleSetId` and preserves the existing payload shape and localStorage keys; structural migration remains a read/import concern.

`hooks/use-export-handlers.ts` calls the active module's `prepareForExport()` before JSON and HTML export. Rhodes Island uses this hook to materialize the default ancestry experience in exported data without mutating the saved sheet. PDF export does not call this hook: it prints the live DOM, where `components/character-sheet-sections/experience-section.tsx` exposes the recommendation as the empty input's placeholder and `data-export-default-value` metadata. Daggerheart's export hook is identity.

## Card ruleset/type index

`card/stores/store-actions.ts` maintains both `cardsByType` and `cardsByRuleSetAndType`. `_rebuildCardsByType()` traverses the card map once and fills both indexes using `getCardRuleSetId()`; untagged cards remain Daggerheart-compatible.

The combined indexes are rebuilt:

- during `initializeSystem()`, after built-in and custom cards are loaded;
- after `reloadCustomCards()`;
- after a successful custom-card import or batch removal;
- after `clearAllCustomCards()`.

The exposed `_addCardToTypeMap()` and `_removeCardFromTypeMap()` helpers update both indexes incrementally. Disabled batches stay in the index and are filtered by the load methods, so toggling a batch does not require a rebuild.

These Maps are in-memory derived state only. `card/stores/unified-card-store.ts` persists configuration through Zustand and the existing card/batch compatibility storage separately; it does not persist either ruleset/type Map. Initialization or the mutation paths above reconstruct them.

## Adding a third ruleset

At minimum:

1. Add the stable ID to `RULE_SET_IDS` in `lib/sheet-data.ts` without renaming existing IDs or storage keys.
2. Add a definition implementing every field of `RuleSetModule`, plus focused implementation files under `lib/rulesets/<id>/` and ruleset-only UI under `components/rulesets/` when needed.
3. Register the definition in `lib/rulesets/registry.ts`; derive labels from the registry rather than creating another map.
4. Add fresh defaults and migration-safe optional fields to `createDefaultSheetData()` / `SheetData`, including automation-version state if the normalizer needs it. Preserve old field names and the default-to-Daggerheart behavior for untagged historical data and cards.
5. Express shared UI differences through capabilities, policies, labels, layout, and page `ruleSetIds`; do not add bare shared-UI ID branches.
6. Tag and convert that ruleset's cards consistently so `getCardRuleSetId()` and `cardsByRuleSetAndType` can isolate them without changing existing card IDs.
7. Cover registry contract, default isolation, migration/load/save recovery, finalization order and results, page/capability visibility, card index/filter/order, and JSON/HTML/PDF export behavior.
8. Run `pnpm exec tsc --noEmit`, `pnpm test:review-gates`, `pnpm test:run -- --reporter=dot`, and `pnpm build`, then perform the manual creation/edit/import/export/print checks for every ruleset.
