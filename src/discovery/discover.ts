import type { HomeAssistant, HassEntity } from '../types/home-assistant';
import type { NormalizedMediaDeckConfig } from '../config/types';
import {
  entityPlatform,
  type EntityRegistryMap,
} from '../registry/entity-registry';

export type DiscoveryKind = 'remote' | 'media-player' | 'audio' | 'source-mapping';
export interface DiscoverySuggestion {
  kind: DiscoveryKind;
  entity: string;
  source?: string;
  confidence: number;
  explanation: string;
}

function words(e: HassEntity) {
  return new Set(
    `${e.entity_id} ${e.attributes.friendly_name ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((word) => word.length > 2),
  );
}

function overlap(a: HassEntity, b: HassEntity) {
  const aw = words(a);
  const bw = words(b);
  return [...aw].filter((word) => bw.has(word)).length / Math.max(aw.size, 1);
}

export function discoverMediaRelationships(
  hass: HomeAssistant,
  config: NormalizedMediaDeckConfig,
  registry: EntityRegistryMap = {},
): DiscoverySuggestion[] {
  const primary = hass.states[config.entity];
  if (!primary || !config.discovery.enabled) return [];
  const primaryRegistry = registry[primary.entity_id];
  const configured = new Set(
    [
      config.entity,
      config.entities.remote,
      config.entities.audio,
      ...(config.entities.related ?? []),
      ...Object.values(config.source_mappings).map((mapping) => mapping.entity),
    ].filter((value): value is string => Boolean(value)),
  );
  const out: DiscoverySuggestion[] = [];

  for (const entity of Object.values(hass.states)) {
    if (configured.has(entity.entity_id) || entity.state === 'unavailable') continue;
    const metadata = registry[entity.entity_id];
    const sameDevice = Boolean(
      primaryRegistry?.device_id && metadata?.device_id === primaryRegistry.device_id,
    );
    const sameArea = Boolean(primaryRegistry?.area_id && metadata?.area_id === primaryRegistry.area_id);
    const score = overlap(primary, entity);
    const platform = entityPlatform(entity, registry)?.toLowerCase() ?? '';

    if (entity.entity_id.startsWith('remote.')) {
      if (sameDevice)
        out.push({
          kind: 'remote',
          entity: entity.entity_id,
          confidence: 0.99,
          explanation: 'Remote belongs to the same Home Assistant device as the primary player.',
        });
      else if (score >= 0.2)
        out.push({
          kind: 'remote',
          entity: entity.entity_id,
          confidence: Math.min(0.95, 0.6 + score / 2 + (sameArea ? 0.08 : 0)),
          explanation: sameArea
            ? 'Remote shares the primary area and naming metadata.'
            : 'Remote shares naming metadata with the primary media device.',
        });
    }

    if (entity.entity_id.startsWith('media_player.')) {
      const text = `${entity.entity_id} ${entity.attributes.friendly_name ?? ''} ${entity.attributes.manufacturer ?? ''} ${platform}`.toLowerCase();
      if (sameDevice)
        out.push({
          kind: 'media-player',
          entity: entity.entity_id,
          confidence: 0.98,
          explanation: 'Media player belongs to the same Home Assistant device as the primary player.',
        });
      else if (/apple.?tv|android|google.?tv|androidtv_remote|cast/.test(text) && score >= 0.1)
        out.push({
          kind: 'media-player',
          entity: entity.entity_id,
          confidence: Math.min(0.94, 0.55 + score / 2 + (sameArea ? 0.08 : 0)),
          explanation: sameArea
            ? 'Likely streaming companion based on platform, area and naming metadata.'
            : 'Likely streaming companion based on platform and naming metadata.',
        });
      if (/avr|receiver|denon|marantz|yamaha|onkyo|sonos/.test(text))
        out.push({
          kind: 'audio',
          entity: entity.entity_id,
          confidence: sameArea ? 0.84 : 0.72,
          explanation: sameArea
            ? 'Likely receiver/audio device in the same Home Assistant area.'
            : 'Likely receiver/audio device based on entity metadata.',
        });
    }
  }

  const sources = Array.isArray(primary.attributes.source_list) ? primary.attributes.source_list : [];
  for (const source of sources as string[]) {
    if (config.source_mappings[source]) continue;
    const match = Object.values(hass.states).find(
      (entity) =>
        entity.entity_id.startsWith('media_player.') &&
        source
          .toLowerCase()
          .split(/\s+/)
          .some(
            (token) =>
              token.length > 2 &&
              `${entity.entity_id} ${entity.attributes.friendly_name ?? ''}`
                .toLowerCase()
                .includes(token),
          ),
    );
    if (match)
      out.push({
        kind: 'source-mapping',
        entity: match.entity_id,
        source,
        confidence: 0.62,
        explanation: `Source “${source}” resembles this media player's name.`,
      });
  }

  return out
    .filter((item) => item.confidence >= config.discovery.minimum_confidence)
    .sort((a, b) => b.confidence - a.confidence);
}
