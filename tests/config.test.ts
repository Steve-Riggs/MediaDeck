import { describe, expect, test } from 'vitest';
import { normalizeConfig } from '../src/config/defaults';
import { migrateConfig, validateConfig } from '../src/config/validate';
const base = { type: 'custom:mediadeck-card' as const, entity: 'media_player.tv' };
describe('MediaDeck config', () => {
  test('normalizes useful defaults without discarding unknown keys', () => {
    const r = normalizeConfig({
      ...base,
      future_key: { enabled: true },
      entities: { audio: 'media_player.avr' },
    });
    expect(r.schema_version).toBe(1);
    expect(r.regions.now_playing).toBe(true);
    expect(r.regions.inspector).toBe(false);
    expect(r.appearance.density).toBe('standard');
    expect(r.entities.audio).toBe('media_player.avr');
    expect(r.future_key).toEqual({ enabled: true });
  });
  test('keeps source mappings and watch actions', () => {
    const r = normalizeConfig({
      ...base,
      source_mappings: { 'HDMI 1': { entity: 'media_player.apple_tv' } },
      watch_actions: [
        {
          name: 'Watch Apple TV',
          action: { action: 'call-service', service: 'script.watch_apple_tv' },
        },
      ],
    });
    expect(r.source_mappings['HDMI 1'].entity).toBe('media_player.apple_tv');
    expect(r.watch_actions[0].action.service).toBe('script.watch_apple_tv');
  });
  test('accepts a dedicated power entity and declarative power actions', () => {
    const config = {
      ...base,
      entities: { power: 'remote.tv' },
      power_actions: {
        on: { action: 'call-service' as const, service: 'script.wake_tv' },
        off: { action: 'call-service' as const, service: 'script.sleep_tv' },
      },
    };
    expect(validateConfig(config).valid).toBe(true);
    const normalized = normalizeConfig(config);
    expect(normalized.entities.power).toBe('remote.tv');
    expect(normalized.power_actions.on?.service).toBe('script.wake_tv');
    expect(normalized.power_actions.off?.service).toBe('script.sleep_tv');
  });
  test('rejects invalid custom actions', () => {
    expect(
      validateConfig({
        ...base,
        custom_actions: { bad: { action: 'javascript', service: 'evil()' } },
      }).valid,
    ).toBe(false);
    expect(validateConfig(base).valid).toBe(true);
  });
  test('rejects malformed power configuration', () => {
    expect(validateConfig({ ...base, entities: { power: 'not-an-entity' } }).valid).toBe(false);
    expect(
      validateConfig({
        ...base,
        power_actions: { on: { action: 'javascript', service: 'evil()' } },
      }).valid,
    ).toBe(false);
  });
  test('migrates while preserving unknown data', () => {
    const r = migrateConfig({ entity: 'media_player.tv', legacy: 42 });
    expect(r.type).toBe('custom:mediadeck-card');
    expect(r.schema_version).toBe(1);
    expect(r.legacy).toBe(42);
  });
});
