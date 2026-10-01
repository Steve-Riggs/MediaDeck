# MediaDeck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable, testable release of MediaDeck as a standalone Home Assistant custom Lovelace card with multi-device media resolution, platform adapters, graphical editing, responsive controls, and HACS-ready packaging.

**Architecture:** MediaDeck separates configuration, media-session resolution, platform adapters, action routing, discovery, and presentation. The UI renders from a normalized `ResolvedMediaSession`, while platform-specific behaviour stays behind adapter interfaces and user-defined Home Assistant actions remain declarative configuration.

**Tech Stack:** TypeScript, Lit web components, Vite library build, Vitest, ESLint, Prettier, Home Assistant frontend APIs, GitHub Actions, HACS-compatible repository metadata.

**Spec:** `docs/superpowers/specs/2026-10-01-mediadeck-design.md`

## Global Constraints

- Card type is exactly `custom:mediadeck-card`.
- House-specific entity IDs, scripts, scenes, and mappings must never be hard-coded into the package.
- Explicit source mappings always override heuristic activity detection.
- Discovery is advisory and never mutates Home Assistant configuration without explicit user acceptance.
- The generic media-player adapter is always available as a fallback.
- One unavailable related entity must not make the entire card unusable when remaining capabilities are still valid.
- User actions are declarative Home Assistant actions, never executable JavaScript.
- No external backend, telemetry, API key, long-lived token, or third-party state/configuration upload.
- Default styling uses Home Assistant theme variables and remains usable in light and dark themes.
- The first release includes generic, Android TV, Apple TV, Samsung TV, and LG webOS adapters.

## Review Focus

- Explicit source mapping versus simultaneously active playback entities: explicit mapping must win deterministically.
- Missing or unavailable secondary entities: unaffected controls and media information must remain usable.
- Unknown integration/platform: generic adapter must be selected without crashing or hiding universally supported features.
- Editor round-trip of advanced/unknown config keys: untouched configuration must be preserved.
- Service/action failure: control state must recover and an unobtrusive error must be surfaced instead of remaining visually stuck.

---

## File Structure

```text
src/
  index.ts                         package registration and custom element exports
  mediadeck-card.ts                main card component and HA sizing hooks
  mediadeck-editor.ts              graphical editor shell
  types/home-assistant.ts          minimal HA frontend contracts used by MediaDeck
  config/types.ts                  public configuration types
  config/defaults.ts               defaults and normalization
  config/validate.ts               validation and migration entry point
  session/types.ts                 normalized media-session contracts
  session/resolve-session.ts       multi-entity resolver
  platforms/types.ts               adapter contracts/capabilities
  platforms/registry.ts            adapter selection
  platforms/generic.ts             generic media_player behaviour
  platforms/android-tv.ts          Android/Google TV behaviour
  platforms/apple-tv.ts            Apple TV behaviour
  platforms/samsung-tv.ts          Samsung behaviour
  platforms/lg-webos.ts            LG webOS behaviour
  actions/types.ts                 declarative UI intent/action contracts
  actions/router.ts                HA service/custom action routing
  discovery/discover.ts            advisory related-entity/source suggestions
  ui/now-playing.ts                artwork/metadata/progress component
  ui/transport-controls.ts         playback controls
  ui/remote-controls.ts            D-pad/remote controls
  ui/source-selector.ts            source controls
  ui/audio-controls.ts             volume/mute controls
  ui/watch-actions.ts              custom high-level actions
  ui/device-inspector.ts           optional resolver diagnostics
  styles/card-styles.ts            theme-safe responsive styles
  editor/entity-section.ts         entity selectors
  editor/source-mappings-section.ts source mapping editor
  editor/layout-section.ts         visibility/order/density editor
  editor/actions-section.ts        custom/watch actions editor
  editor/appearance-section.ts     sizing/colour/opacity editor
  editor/discovery-section.ts      advisory suggestions UI

tests/
  config.test.ts
  platform-registry.test.ts
  resolve-session.test.ts
  action-router.test.ts
  discovery.test.ts
  editor.test.ts
  card.test.ts

.github/workflows/
  ci.yml
  release.yml

package.json
vite.config.ts
tsconfig.json
vitest.config.ts
eslint.config.js
.prettierrc
hacs.json
README.md
LICENSE
```

---

### Task 1: Project scaffold and build pipeline

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`, `src/index.ts`, `src/types/home-assistant.ts`, `tests/card.test.ts`

**Interfaces:**
- Produces: browser ES module build and exported `MediaDeckCard`/`MediaDeckEditor` registration entry point.

- [ ] **Step 1: Write the failing smoke test**

Create a test asserting that importing `src/index.ts` registers/exports `mediadeck-card` without throwing.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run tests/card.test.ts`
Expected: FAIL because project/build files and card exports do not exist.

- [ ] **Step 3: Implement the minimal TypeScript/Vite/Vitest scaffold**

Set package scripts for `build`, `test`, `typecheck`, `lint`, and `format:check`. Configure Vite library output as a single browser-loadable ES module in `dist/`.

- [ ] **Step 4: Run verification**

Run: `npm run typecheck && npm test -- --run tests/card.test.ts && npm run build`
Expected: PASS and a distributable JS module appears in `dist/`.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json vitest.config.ts eslint.config.js .prettierrc src tests
git commit -m "chore: scaffold MediaDeck frontend package"
```

### Task 2: Configuration model, defaults, validation, and migrations

**Files:**
- Create: `src/config/types.ts`, `src/config/defaults.ts`, `src/config/validate.ts`, `tests/config.test.ts`

**Interfaces:**
- Produces: `MediaDeckConfig`, `normalizeConfig(input: MediaDeckConfig): NormalizedMediaDeckConfig`, `validateConfig(input: unknown): ValidationResult`, `migrateConfig(input: unknown): MediaDeckConfig`.

- [ ] **Step 1: Write failing tests for defaults and preservation**

Cover minimum primary entity config, visibility defaults, appearance defaults, source mappings, separate audio entity, unknown future keys preservation, and invalid action structures.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/config.test.ts`
Expected: FAIL because config contracts are undefined.

- [ ] **Step 3: Implement typed configuration and normalization**

Include schema versioning, regions, entity roles, source mappings, custom/watch actions, appearance, section ordering, discovery settings, and density presets.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/config.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config tests/config.test.ts
git commit -m "feat: add MediaDeck configuration model"
```

### Task 3: Platform adapter abstraction and built-in adapters

**Files:**
- Create: `src/platforms/types.ts`, `src/platforms/registry.ts`, `src/platforms/generic.ts`, `src/platforms/android-tv.ts`, `src/platforms/apple-tv.ts`, `src/platforms/samsung-tv.ts`, `src/platforms/lg-webos.ts`, `tests/platform-registry.test.ts`

**Interfaces:**
- Consumes: normalized config and Home Assistant state objects.
- Produces: `PlatformAdapter`, `MediaCapabilities`, `selectPlatformAdapter(context): PlatformAdapter`.

- [ ] **Step 1: Write failing adapter-selection tests**

Assert known Android TV, Apple TV, Samsung, and LG state signatures resolve to their adapters and unknown platforms resolve to generic.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/platform-registry.test.ts`
Expected: FAIL because registry/adapters do not exist.

- [ ] **Step 3: Implement adapter contracts and minimal platform detection/capabilities**

Adapters must normalize capability checks only; presentation logic remains outside adapters.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/platform-registry.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/platforms tests/platform-registry.test.ts
git commit -m "feat: add platform adapter system"
```

### Task 4: Media session resolver

**Files:**
- Create: `src/session/types.ts`, `src/session/resolve-session.ts`, `tests/resolve-session.test.ts`

**Interfaces:**
- Consumes: `NormalizedMediaDeckConfig`, Home Assistant states, adapter registry.
- Produces: `resolveMediaSession(hass, config): ResolvedMediaSession` with active, metadata, transport, remote, audio, source, state, adapter, capabilities, and resolution-reason fields.

- [ ] **Step 1: Write failing resolver tests**

Cover explicit mapping precedence, playback fallback, preferred role entities, primary fallback, separate AVR audio routing, unknown source, secondary unavailable, and generic adapter fallback.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/resolve-session.test.ts`
Expected: FAIL because resolver is undefined.

- [ ] **Step 3: Implement deterministic role resolution**

Use the exact priority order from the spec and record the winning reason for device-inspector diagnostics.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/resolve-session.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session tests/resolve-session.test.ts
git commit -m "feat: resolve unified media sessions"
```

### Task 5: Action router and capability-safe execution

**Files:**
- Create: `src/actions/types.ts`, `src/actions/router.ts`, `tests/action-router.test.ts`

**Interfaces:**
- Consumes: `ResolvedMediaSession`, `PlatformAdapter`, declarative custom actions, Home Assistant `callService`.
- Produces: `canExecuteIntent(session, intent): boolean`, `executeIntent(hass, session, intent): Promise<ActionResult>`.

- [ ] **Step 1: Write failing action-routing tests**

Cover play/pause, volume target on separate AVR, mute, source select, remote direction/select/back/home, custom script action, unsupported action suppression, and service-call rejection recovery.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/action-router.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement standard/custom action routing**

Do not execute arbitrary JavaScript. Return structured success/failure results for UI feedback.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/action-router.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/actions tests/action-router.test.ts
git commit -m "feat: add capability-aware action routing"
```

### Task 6: Discovery engine

**Files:**
- Create: `src/discovery/discover.ts`, `tests/discovery.test.ts`

**Interfaces:**
- Consumes: Home Assistant states/device metadata where available and current config.
- Produces: `discoverMediaRelationships(hass, config): DiscoverySuggestion[]`.

- [ ] **Step 1: Write failing discovery tests**

Cover matching media-player/remote entities, likely Apple/Android companion devices, AVR suggestions, source-name correlation, missing registry metadata, and no implicit config mutation.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/discovery.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement advisory scoring and suggestions**

Suggestions must carry explanation/confidence fields and require explicit acceptance by editor code.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/discovery.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/discovery tests/discovery.test.ts
git commit -m "feat: add advisory media discovery"
```

### Task 7: Core card UI and responsive controls

**Files:**
- Create: `src/mediadeck-card.ts`, `src/ui/now-playing.ts`, `src/ui/transport-controls.ts`, `src/ui/remote-controls.ts`, `src/ui/source-selector.ts`, `src/ui/audio-controls.ts`, `src/ui/watch-actions.ts`, `src/ui/device-inspector.ts`, `src/styles/card-styles.ts`
- Modify: `src/index.ts`, `tests/card.test.ts`

**Interfaces:**
- Consumes: normalized config, `resolveMediaSession`, `executeIntent`.
- Produces: custom element `mediadeck-card`, `setConfig`, `hass`, `getCardSize()`, `getGridOptions()`, `getConfigElement()`, `getStubConfig()`, and optional entity suggestion hook.

- [ ] **Step 1: Expand failing component tests**

Cover loading, missing primary entity, unavailable secondary entity, no artwork, active mapped source, feature-aware visibility, service error recovery, and optional inspector rendering.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/card.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the media-first responsive card**

Use theme variables by default, container-aware CSS, configurable visibility/order/density, and no dependency on `card-mod`.

- [ ] **Step 4: Run focused and full verification**

Run: `npm test -- --run tests/card.test.ts && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mediadeck-card.ts src/ui src/styles src/index.ts tests/card.test.ts
git commit -m "feat: build MediaDeck card interface"
```

### Task 8: Full graphical editor

**Files:**
- Create: `src/mediadeck-editor.ts`, `src/editor/entity-section.ts`, `src/editor/source-mappings-section.ts`, `src/editor/layout-section.ts`, `src/editor/actions-section.ts`, `src/editor/appearance-section.ts`, `src/editor/discovery-section.ts`, `tests/editor.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `MediaDeckConfig`, discovery suggestions, Home Assistant state catalog.
- Produces: `mediadeck-editor` custom element dispatching standard `config-changed` events while preserving untouched config keys.

- [ ] **Step 1: Write failing editor tests**

Cover primary entity selection, related entity roles, source mapping add/remove, visibility/order edits, action edits, appearance changes, accepting discovery suggestions, and preservation of unknown keys.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run tests/editor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement editor sections and immutable config updates**

Use suitable entity-domain filtering and standard Home Assistant `config-changed` event semantics.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run tests/editor.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mediadeck-editor.ts src/editor src/index.ts tests/editor.test.ts
git commit -m "feat: add MediaDeck graphical editor"
```

### Task 9: HACS packaging, documentation, and CI

**Files:**
- Create: `hacs.json`, `README.md`, `LICENSE`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Modify: `package.json`, `vite.config.ts`

**Interfaces:**
- Produces: documented manual/HACS installation workflow and automated build/test/release validation.

- [ ] **Step 1: Add packaging validation expectations**

Document the expected dist filename and ensure package scripts make the release asset reproducible.

- [ ] **Step 2: Implement CI**

CI runs install, format check, lint, typecheck, tests, and production build on pushes/PRs. Release workflow builds the distributable and attaches the HACS-consumable asset to version tags.

- [ ] **Step 3: Write end-user README**

Include installation, minimum config, TV + Apple TV example, TV + Android TV example, AVR volume example, explicit source mappings, Watch actions, editor usage, troubleshooting, and privacy model.

- [ ] **Step 4: Run complete local verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test -- --run && npm run build`
Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add hacs.json README.md LICENSE .github package.json vite.config.ts
git commit -m "chore: prepare MediaDeck for HACS and CI"
```

### Task 10: Release-candidate integration verification

**Files:**
- Modify only files required by failures found during integrated verification.

**Interfaces:**
- Consumes: complete package from Tasks 1–9.
- Produces: build ready for first Home Assistant installation test.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test -- --run && npm run build`
Expected: PASS with no warnings treated as release blockers.

- [ ] **Step 2: Verify distribution surface**

Inspect the built module to confirm it registers `custom:mediadeck-card`, exposes the editor hooks, contains no user-specific entities/secrets, and does not require external network services.

- [ ] **Step 3: Review first-install examples against the spec**

Validate minimum generic TV, TV + Apple TV, TV + Android TV, TV + AVR, unavailable companion, and explicit HDMI mapping scenarios.

- [ ] **Step 4: Fix only integration defects and rerun the owning tests**

Every defect receives a regression assertion in the closest existing test file before the fix.

- [ ] **Step 5: Commit release-candidate fixes**

```bash
git add src tests dist README.md
git commit -m "fix: harden MediaDeck initial release candidate"
```

## Completion Gate

The implementation is complete when all ten tasks are committed, the complete verification command passes, the production module builds successfully, HACS metadata and workflows are valid, and the card can be installed into Home Assistant for the first live-dashboard test without any house-specific code in the repository.
