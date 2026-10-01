# MediaDeck Design Specification

## Product goal

MediaDeck is a standalone Home Assistant custom Lovelace card for controlling a complete TV/media setup from one coherent interface. It must present what is actually playing, regardless of whether playback originates from the television itself, an Android TV / Google TV device, Apple TV, another media player, or an explicitly mapped HDMI/source device.

The card is intended to feel like a purpose-built media remote rather than a generic entity card. It must work well on wall-mounted tablets and normal Home Assistant dashboards, expose a full graphical configuration editor, and allow every major UI region to be enabled, hidden, reordered or visually customised.

House-specific entities, source mappings, scripts and automations are configuration consumed by MediaDeck; they are not hard-coded into the package.

## Core principles

1. **Media-first** — artwork, title, subtitle, playback state and active source are the primary information hierarchy.
2. **One logical media system** — a TV, streaming box, AVR and related entities can be presented as one deck even when several Home Assistant entities are involved.
3. **Explicit mappings win** — configured HDMI/source mappings always override heuristic activity detection.
4. **Discovery suggests; it never mutates** — MediaDeck may recommend related entities and mappings, but must never silently change Home Assistant configuration.
5. **Feature-aware controls** — controls appear only when the active entity/device supports the required feature or an explicit custom action is configured.
6. **Graceful degradation** — missing, unavailable or partially supported entities must not break the whole card.
7. **Theme-safe** — colours inherit Home Assistant theme variables by default and must remain readable in light and dark themes.
8. **Independent frontend component** — avoid relying on unstable/private Home Assistant frontend internals where a normal web component can provide the same behaviour.

## Supported Home Assistant model

MediaDeck is driven primarily by Home Assistant state objects and service calls. The first-party abstraction layer must support:

- Generic `media_player` entities.
- Android TV / Google TV media players and remote entities.
- Apple TV media players and remote entities.
- Samsung TV media players.
- LG webOS media players.
- Separate AVR / receiver media players for volume and source routing.
- Optional `remote` entities for directional navigation and key commands.
- Optional scripts/scenes/custom actions for multi-device operations.

Future integrations must be addable through adapters without changing the core card.

## Card architecture

MediaDeck is split into five logical layers.

### 1. Configuration layer

Parses and validates the Lovelace card configuration and supplies defaults. Configuration is versioned so future releases can migrate old configuration safely.

The top-level card type is:

```yaml
type: custom:mediadeck-card
```

The minimum useful configuration is a primary media entity. Advanced configurations may supply related device entities, remote entities, AVR entities, source mappings, custom actions and appearance overrides.

### 2. Media fabric / resolver

The resolver turns multiple Home Assistant entities into one `ResolvedMediaSession` consumed by the UI.

It must determine:

- which entity currently owns playback;
- which entity supplies artwork and media metadata;
- which entity supplies transport controls;
- which entity supplies navigation/remote commands;
- which entity controls volume;
- which source/input is active;
- the active platform adapter;
- whether the system is powered, idle, playing, paused, unavailable or partially available.

Resolution priority:

1. Explicit source mapping for the current TV/receiver input.
2. Explicit user-selected preferred entity for the configured function.
3. Active playback/activity evidence from mapped entities.
4. Primary configured media entity.
5. Best available fallback.

Heuristics must never override an explicit mapping.

### 3. Platform adapters

Adapters normalise platform-specific behaviour into a stable interface. Initial adapters:

- `generic-media-player`
- `android-tv`
- `apple-tv`
- `samsung-tv`
- `lg-webos`

Adapters expose capability checks and action methods rather than leaking integration-specific behaviour into the card UI.

The generic adapter must always be available as the fallback.

### 4. Action router

The action router resolves a UI intent into either:

- a standard Home Assistant service call;
- an adapter-specific service call;
- a configured custom Home Assistant action;
- a configured script/scene invocation.

Supported intent families include power, play/pause, stop, previous, next, seek, volume, mute, source selection, directional navigation, select/back/home/menu, Android TV text entry where supported, and arbitrary configured user actions.

No action should be rendered as usable when neither a supported entity capability nor an explicit custom action exists.

### 5. Presentation layer

The card renders from `ResolvedMediaSession` and configuration only. Platform-specific conditionals should remain outside presentation components wherever possible.

## UI regions

The default layout is responsive and media-first. The following regions can each be shown or hidden:

### Now playing

- Artwork / poster / channel image.
- Media title.
- Artist, programme, series, app or secondary metadata as available.
- Playback state.
- Active source/device indicator.
- Optional progress/seek bar when duration/position are available.

Artwork must support configurable fit, crop, corner radius, opacity and background treatment.

### Transport controls

- Previous.
- Play/pause.
- Next.
- Stop when supported/configured.
- Optional skip/seek actions.

### Remote control

Default remote layout includes:

- Up/down/left/right.
- Centre/select.
- Back.
- Home.
- Menu/context where supported.

Optional additional buttons and custom actions can be placed in the remote grid. Android TV text-entry support is exposed when a configured adapter/entity can provide it.

### Source selector

Shows configured/discovered sources and allows selecting inputs/apps when supported. Friendly names, icons and source ordering are configurable.

### Audio controls

- Volume slider.
- Volume up/down.
- Mute.

Audio may target a different entity from playback, such as an AVR. Separate AVR volume must be a first-class configuration rather than a special case in the UI.

### Watch actions

Users may define high-level actions such as “Watch Apple TV”, “Watch TV”, or “Watch Android TV”. These invoke Home Assistant scripts/scenes/custom actions and are intended for multi-device sequences such as powering devices, changing receiver input and selecting a source.

MediaDeck does not replicate Home Assistant automation logic internally.

### Device inspector

An optional troubleshooting/advanced panel shows the resolver’s current decisions without exposing secrets. It should show:

- active entity;
- metadata entity;
- transport entity;
- remote entity;
- audio entity;
- detected adapter/platform;
- active source;
- relevant supported features/capabilities;
- why the current entity/source was chosen.

This is hidden by default in normal use.

## Customisation

Every major UI region must support user-controlled visibility. Appearance options include at minimum:

- overall card width/height behaviour;
- compact, standard and expanded density presets;
- component sizing;
- spacing/gaps;
- corner radius;
- background colour;
- card/background opacity;
- text colour overrides;
- accent colour;
- control/button background colour and opacity;
- artwork size and fit;
- icon size;
- font scaling;
- section order.

Defaults use Home Assistant theme variables. Explicit user values override defaults.

Customisation must not require `card-mod`.

## Responsive behaviour

MediaDeck must work in Home Assistant Masonry and Sections dashboards and on dedicated tablet dashboards.

The card will implement Home Assistant sizing hooks including `getCardSize()` and `getGridOptions()` so the dashboard can lay it out predictably.

The presentation should use container-aware responsive CSS. Narrow cards collapse secondary controls before sacrificing the now-playing area. Larger layouts may display artwork, metadata and remote controls side by side.

## Graphical editor

MediaDeck ships with a full graphical card editor exposed through `getConfigElement()` and a useful `getStubConfig()`.

Editor sections:

1. Primary device.
2. Related media/remote/audio entities.
3. Source mappings.
4. Layout and visible regions.
5. Controls.
6. Watch/custom actions.
7. Appearance.
8. Advanced/discovery settings.

The editor must dispatch standard `config-changed` events and preserve configuration that it does not directly edit.

Where practical, entity selectors should filter to suitable Home Assistant domains.

The card registers itself in `window.customCards` and, on supported Home Assistant releases, provides `getEntitySuggestion` for sensible `media_player` entities only.

## Discovery

Discovery is advisory. It analyses Home Assistant entities/device metadata and suggests likely relationships, for example:

- media player + matching remote entity;
- TV + Android TV / Apple TV entity;
- TV + AVR;
- source names matching mapped devices.

Suggested mappings are shown in the graphical editor and require explicit user acceptance before becoming card configuration.

Discovery must tolerate installations where device registry metadata is incomplete.

## Source mappings

A source mapping connects a source/input on the primary TV or AVR to a logical playback device.

Example conceptual mapping:

```yaml
source_mappings:
  HDMI 1:
    entity: media_player.apple_tv
    remote: remote.apple_tv
    label: Apple TV
  HDMI 2:
    entity: media_player.android_tv
    remote: remote.android_tv
    label: Android TV
```

Exact final schema will be type-safe and versioned, but the semantics above are fixed: when the selected source has an explicit mapping, that mapping takes priority over activity scoring.

## Custom actions

Buttons and watch actions use a Home Assistant-compatible action definition capable of representing service calls/scripts/scenes. MediaDeck validates the structure before execution and surfaces an in-card/editor error for invalid configured actions.

User action definitions are configuration, not executable JavaScript.

## State and error handling

The card must have explicit presentation for:

- initial loading;
- primary entity missing;
- entity unavailable;
- related device unavailable while the primary device remains usable;
- media idle/off but remote power still available;
- no artwork;
- unknown source;
- unsupported requested action;
- invalid configuration.

One failing related entity must not make the entire deck unusable.

Service-call failures should be caught and reported unobtrusively rather than leaving controls visually stuck.

## Security and privacy

MediaDeck runs entirely inside the Home Assistant frontend and uses the authenticated Home Assistant connection available to the card. It must not require a separate cloud service, external telemetry, API key, long-lived access token or remote backend.

No entity states, names or configuration are sent to third parties by the card.

## Technology and repository structure

Implementation language: TypeScript.

UI technology: standards-based web components, using Lit where useful while avoiding unsupported dependencies on private Home Assistant frontend components.

Build output: a browser-loadable ES module suitable for Home Assistant dashboard resources and HACS.

Planned repository shape:

```text
src/
  mediadeck-card.ts
  mediadeck-editor.ts
  config/
  resolver/
  discovery/
  platforms/
  controls/
  actions/
  artwork/
  styles/
tests/
docs/
dist/
.github/workflows/
```

Supporting project files include `package.json`, TypeScript/build/test configuration, `hacs.json`, license and user documentation.

## Distribution

MediaDeck is designed to be installable manually and through HACS as a frontend/plugin repository.

The release process must produce a deterministic distributable JavaScript module and attach/build it in a GitHub release workflow suitable for HACS consumption.

Semantic versioning is used. Initial development remains pre-1.0 until the configuration schema and public behaviour stabilise.

## Testing strategy

Unit tests must cover at minimum:

- configuration parsing/defaults;
- adapter selection;
- platform capability normalisation;
- resolver/routing decisions;
- explicit source mapping precedence;
- playback activity fallback;
- separate audio entity routing;
- unavailable/missing related entities;
- unknown sources;
- action routing;
- editor config preservation;
- feature visibility decisions.

Component tests should cover the main UI states and editor events.

Build/CI validation must run type checking, linting, tests and production build before a change is considered releasable.

## Initial release scope

The first usable MediaDeck release must provide:

- a working `custom:mediadeck-card`;
- primary + related entity configuration;
- media resolver/fabric;
- generic, Android TV, Apple TV, Samsung and LG webOS adapters;
- artwork/now-playing view;
- transport controls;
- remote/D-pad controls;
- source selector and explicit source mappings;
- separate audio/AVR controls;
- Android text entry where supported;
- custom/watch actions backed by Home Assistant services/scripts;
- graphical editor;
- discovery suggestions;
- optional device inspector;
- responsive sizing and visual customisation;
- documented manual/HACS installation path;
- automated tests and CI.

Features outside that list should not delay the first usable release unless they are required to make one of the listed features safe or maintainable.

## Acceptance criteria

MediaDeck is ready for an initial user test when a user can add it from Home Assistant’s card UI, select a TV/media entity, optionally associate streaming/remote/AVR entities, and control the resulting media system without writing JavaScript.

Switching an explicitly mapped TV/AVR source must change MediaDeck’s logical active device predictably. Now-playing data and transport actions must follow the correct playback entity, while volume can independently remain attached to an AVR. If a secondary device becomes unavailable, the rest of the card must remain functional where capabilities permit.

All major sections can be hidden, sizing and visual appearance can be changed from configuration/editor, and those settings survive editor round-trips without losing unrelated configuration.