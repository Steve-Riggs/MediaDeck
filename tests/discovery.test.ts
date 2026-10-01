import { describe, expect, test } from 'vitest';
import { discoverMediaRelationships } from '../src/discovery/discover';
import { normalizeConfig } from '../src/config/defaults';
import { entity, hass } from './helpers';
describe('discovery', () => {
  test('suggests matching relationships without mutating config', () => {
    const h = hass([
      entity('media_player.living_room_tv', 'on', {
        friendly_name: 'Living Room TV',
        source_list: ['Apple TV'],
      }),
      entity('remote.living_room_tv', 'on', { friendly_name: 'Living Room TV Remote' }),
      entity('media_player.living_room_apple_tv', 'idle', {
        friendly_name: 'Living Room Apple TV',
        model: 'Apple TV 4K',
      }),
    ]);
    const c = normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.living_room_tv',
      }),
      before = JSON.stringify(c),
      s = discoverMediaRelationships(h, c);
    expect(s.some((i) => i.kind === 'remote')).toBe(true);
    expect(s.some((i) => i.entity === 'media_player.living_room_apple_tv')).toBe(true);
    expect(JSON.stringify(c)).toBe(before);
  });
  test('suggests AVR without registry metadata', () => {
    const h = hass([
      entity('media_player.tv', 'on', { source_list: [] }),
      entity('media_player.denon_avr', 'on', { friendly_name: 'Denon AVR' }),
    ]);
    expect(
      discoverMediaRelationships(
        h,
        normalizeConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' }),
      ),
    ).toContainEqual(expect.objectContaining({ kind: 'audio', entity: 'media_player.denon_avr' }));
  });
});
