import { describe, expect, test } from 'vitest';
import { selectPlatformAdapter } from '../src/platforms/registry';
import { entity } from './helpers';
describe('platform registry', () => {
  test.each([
    ['media_player.living_room_android_tv', { integration: 'androidtv' }, 'android-tv'],
    ['media_player.apple_tv', { model: 'Apple TV 4K' }, 'apple-tv'],
    ['media_player.samsung', { manufacturer: 'Samsung' }, 'samsung-tv'],
    ['media_player.lg', { integration: 'webostv' }, 'lg-webos'],
    ['media_player.unknown', { manufacturer: 'Acme' }, 'generic'],
  ])('selects %s', (id, attrs, expected) => {
    expect(selectPlatformAdapter({ entity: entity(id, 'idle', attrs) }).id).toBe(expected);
  });
  test('generic fallback is safe', () => {
    const a = selectPlatformAdapter({});
    expect(a.id).toBe('generic');
    expect(a.capabilities({}).remoteNavigation).toBe(false);
  });
});
