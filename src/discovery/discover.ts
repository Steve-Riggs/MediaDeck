import type { HomeAssistant, HassEntity } from '../types/home-assistant';
import type { NormalizedMediaDeckConfig } from '../config/types';
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
      .filter((w) => w.length > 2),
  );
}
function overlap(a: HassEntity, b: HassEntity) {
  const aw = words(a),
    bw = words(b);
  return [...aw].filter((w) => bw.has(w)).length / Math.max(aw.size, 1);
}
export function discoverMediaRelationships(
  hass: HomeAssistant,
  config: NormalizedMediaDeckConfig,
): DiscoverySuggestion[] {
  const primary = hass.states[config.entity];
  if (!primary || !config.discovery.enabled) return [];
  const configured = new Set(
    [
      config.entity,
      config.entities.remote,
      config.entities.audio,
      ...(config.entities.related ?? []),
      ...Object.values(config.source_mappings).map((m) => m.entity),
    ].filter((v): v is string => Boolean(v)),
  );
  const out: DiscoverySuggestion[] = [];
  for (const e of Object.values(hass.states)) {
    if (configured.has(e.entity_id) || e.state === 'unavailable') continue;
    const score = overlap(primary, e);
    if (e.entity_id.startsWith('remote.') && score >= 0.2)
      out.push({
        kind: 'remote',
        entity: e.entity_id,
        confidence: Math.min(0.95, 0.6 + score / 2),
        explanation: 'Remote shares naming metadata with the primary media device.',
      });
    if (e.entity_id.startsWith('media_player.')) {
      const text =
        `${e.entity_id} ${e.attributes.friendly_name ?? ''} ${e.attributes.manufacturer ?? ''}`.toLowerCase();
      if (/apple.?tv|android|google.?tv/.test(text) && score >= 0.1)
        out.push({
          kind: 'media-player',
          entity: e.entity_id,
          confidence: Math.min(0.92, 0.55 + score / 2),
          explanation: 'Likely streaming companion based on platform and naming metadata.',
        });
      if (/avr|receiver|denon|marantz|yamaha|onkyo|sonos/.test(text))
        out.push({
          kind: 'audio',
          entity: e.entity_id,
          confidence: 0.72,
          explanation: 'Likely receiver/audio device based on entity metadata.',
        });
    }
  }
  const sources = Array.isArray(primary.attributes.source_list)
    ? primary.attributes.source_list
    : [];
  for (const source of sources as string[]) {
    if (config.source_mappings[source]) continue;
    const match = Object.values(hass.states).find(
      (e) =>
        e.entity_id.startsWith('media_player.') &&
        source
          .toLowerCase()
          .split(/\s+/)
          .some(
            (t) =>
              t.length > 2 &&
              `${e.entity_id} ${e.attributes.friendly_name ?? ''}`.toLowerCase().includes(t),
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
    .filter((i) => i.confidence >= config.discovery.minimum_confidence)
    .sort((a, b) => b.confidence - a.confidence);
}
