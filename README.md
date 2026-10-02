# MediaDeck

MediaDeck is a media-first Home Assistant Lovelace card that presents a TV, streaming devices, remote entities and an AVR as one coherent control surface.

> **Status:** early alpha. Configuration may evolve before 1.0.

## Highlights

- Artwork, title, secondary metadata, playback state, progress and active source.
- Unified playback resolution across TVs, Apple TV, Android / Google TV and other mapped players.
- Generic, Android TV, Apple TV, Samsung TV and LG webOS platform adapters.
- Capability-aware transport controls and remote D-pad controls.
- Separate AVR/audio routing for volume and mute.
- Independent TV power controller with optional wake/sleep service overrides.
- Explicit HDMI/source mappings that always override activity heuristics.
- Declarative **Watch** actions backed by normal Home Assistant services/scripts.
- Graphical editor, discovery suggestions and optional device inspector.
- Responsive layout, Home Assistant theme defaults, colour/opacity/sizing controls, and no `card-mod` requirement.

## Installation

### HACS

Add `https://github.com/Steve-Riggs/MediaDeck` as a custom **Dashboard** repository in HACS, then install MediaDeck. The release asset is `mediadeck.js`.

### Manual

Download `mediadeck.js`, copy it to `/config/www/mediadeck.js`, and add `/local/mediadeck.js` as a JavaScript module under **Settings → Dashboards → Resources**.

## Minimum configuration

```yaml
type: custom:mediadeck-card
entity: media_player.living_room_tv
```

## TV + Apple TV

```yaml
type: custom:mediadeck-card
entity: media_player.living_room_tv
entities:
  remote: remote.living_room_apple_tv
  related:
    - media_player.living_room_apple_tv
source_mappings:
  HDMI 1:
    entity: media_player.living_room_apple_tv
    remote: remote.living_room_apple_tv
    label: Apple TV
```

## TV + Android / Google TV

```yaml
type: custom:mediadeck-card
entity: media_player.living_room_tv
entities:
  remote: remote.shield
  related:
    - media_player.shield
source_mappings:
  HDMI 2:
    entity: media_player.shield
    remote: remote.shield
    label: NVIDIA Shield
```

## Separate AVR volume

```yaml
type: custom:mediadeck-card
entity: media_player.living_room_tv
entities:
  audio: media_player.denon_avr
  related:
    - media_player.apple_tv
```

Metadata and transport can follow the active player while volume remains attached to the AVR.

## Independent power control

In the visual editor, choose **Power entity** under **Devices**. This can be a `media_player.*` or `remote.*` entity; when omitted, power uses the primary media entity. Navigation still uses the separate **Remote entity**.

```yaml
type: custom:mediadeck-card
entity: media_player.living_room_tv
entities:
  power: remote.living_room_tv
  remote: remote.shield
```

Optional **Power on service** and **Power off service** fields override the controller's normal `turn_on` and `turn_off` services. For actions needing a target, data or confirmation, use YAML:

```yaml
power_actions:
  on:
    action: call-service
    service: script.wake_living_room_tv
  off:
    action: call-service
    service: script.turn_on
    target:
      entity_id: script.sleep_living_room_tv
    confirmation: Turn off the sitting room TV?
```

If the power controller reports `off`, `unknown` or `unavailable`, or is missing, the power button selects the on action. Other reported states use the off action. A missing controller needs an on-service override; otherwise MediaDeck reports that the action is unsupported. Unknown state does not guarantee that the physical TV is off; choose a reliable controller or a wake script for your setup.

## Watch actions

Keep complex multi-device sequencing in Home Assistant scripts, then expose them in MediaDeck:

```yaml
watch_actions:
  - name: Watch Apple TV
    action:
      action: call-service
      service: script.watch_apple_tv
  - name: Watch TV
    action:
      action: call-service
      service: script.watch_television
```

MediaDeck never executes JavaScript from card configuration.

## Visual editor and discovery

The graphical editor covers primary/power/transport/remote/audio entities, power services, region visibility, appearance and discovery. Incomplete service entries show a validation message and stay editable; they are only sent to the dashboard once corrected. Discovery is advisory: no suggestion changes your configuration until you explicitly accept it.

## Device inspector

```yaml
regions:
  inspector: true
```

The inspector shows active, metadata, transport, remote and audio entities, the chosen platform adapter, source, and resolver reason.

## Appearance

```yaml
appearance:
  density: standard
  artwork_size: 180
  artwork_fit: cover
  border_radius: 20
  opacity: 0.96
  accent_color: var(--primary-color)
```

All appearance values are optional; Home Assistant theme variables are used by default.

## Troubleshooting

- **Wrong streaming device:** configure an explicit `source_mappings` entry. Explicit mappings win deterministically.
- **Remote pad hidden:** configure an available `remote.*` entity.
- **Volume controls missing:** configure `entities.audio` when an AVR/sound system handles audio and ensure it exposes media-player volume features.
- **Companion unavailable:** MediaDeck falls back where possible so a secondary outage does not disable the whole deck.

## Privacy

MediaDeck runs entirely in the Home Assistant frontend using the authenticated connection already available to dashboard cards. It has no cloud backend, telemetry, API keys, long-lived tokens or third-party state/configuration upload.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

The production asset is `dist/mediadeck.js`.

## License

MIT

## Artwork sources

In the visual editor, choose **Artwork → Artwork source**:

- **Home Assistant** (default): uses the metadata entity's `entity_picture`; makes no external artwork lookup requests.
- **TMDB**: searches movie/series titles or uses a known TMDB ID, then retrieves a poster or backdrop.
- **Fanart.tv**: uses movie TMDB/IMDb IDs or series TVDB IDs. When only a title is available, TMDB identifies the title and, for series, resolves its TVDB ID first.

Choose **Poster** or **Background / landscape** and use **Artwork fit → Show whole image** to avoid cropping. The **Fall back to Home Assistant artwork** switch preserves the local picture if the selected service has no match, fails or returns an image that cannot load. A labelled app tile is shown when no usable picture exists.

```yaml
artwork:
  provider: fanart # home-assistant, tmdb, fanart
  fanart_api_key: YOUR_FANART_PROJECT_KEY
  fanart_client_key: YOUR_OPTIONAL_PERSONAL_KEY
  tmdb_api_key: YOUR_TMDB_API_KEY
  image_type: poster # poster or backdrop
  language: en
  fallback: true
```

Fanart.tv requires a **project API key**; its optional personal key is a separate `client_key`, not a replacement for the project key. Get keys from [Fanart.tv](https://fanart.tv/get-an-api-key/) and [TMDB](https://www.themoviedb.org/settings/api). Keys are stored in dashboard configuration and visible to dashboard users; password fields only mask them in the editor. External lookup mode sends the programme title or content ID to the selected services. Browser restrictions, invalid keys or service outages produce a status message and fallback instead of breaking TV controls.

The metadata entity must expose an actual `media_title` or `media_series_title`. Knowing that Netflix or Disney+ is open cannot identify the programme. Episodes use the series title for artwork. Optional metadata attributes `media_year`, `tmdb_id`, `tvdb_id` and `imdb_id` can disambiguate a title; TV IDs must identify the **series**, not an episode. Exact title matches are required and multiple matches are not silently guessed. Results are cached for five minutes, and old requests cannot replace artwork after a provider or programme change. You can keep Home Assistant mode selected and use a separate metadata entity whenever your integration already provides artwork.

## Friendly app names and visibility

Common Android package IDs display as friendly app names while service calls retain the original IDs. Optional overrides can be added in the editor:

```yaml
app_names:
  com.example.player: My player
regions:
  sources: false
```

**Layout → Sources** hides only the source selector; the current source can still be shown in the now-playing summary. Hidden and unavailable sections no longer leave empty layout gaps.

## Easier appearance controls

Compact, Standard and Expanded presets adjust layout spacing and artwork size. Sliders show their values; colour pickers include a **Theme** reset button, and **Reset appearance** restores all defaults. Advanced sizing includes minimum height (0 means natural height). Artwork sizing is honoured in compact and narrow layouts within the space available. Existing YAML appearance values remain supported.

TMDB attribution: This product uses the TMDB API but is not endorsed or certified by TMDB. The editor/card provide provider credits when lookup mode is enabled.
