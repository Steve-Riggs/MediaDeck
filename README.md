# MediaDeck

MediaDeck is a media-first Home Assistant Lovelace card that presents a TV, streaming devices, remote entities and an AVR as one coherent control surface.

> **Status:** early alpha. Configuration may evolve before 1.0.

## Highlights

- Artwork, title, secondary metadata, playback state, progress and active source.
- Unified playback resolution across TVs, Apple TV, Android / Google TV and other mapped players.
- Generic, Android TV, Apple TV, Samsung TV and LG webOS platform adapters.
- Capability-aware transport controls and remote D-pad controls.
- Separate AVR/audio routing for volume and mute.
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

The graphical editor covers primary/transport/remote/audio entities, region visibility, appearance and discovery. Discovery is advisory: no suggestion changes your configuration until you explicitly accept it.

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
