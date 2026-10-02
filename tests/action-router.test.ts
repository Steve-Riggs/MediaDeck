import { describe, expect, test } from 'vitest';
import { executeIntent } from '../src/actions/router';
import { resolveMediaSession } from '../src/session/resolve-session';
import { normalizeConfig } from '../src/config/defaults';
import { entity, hass } from './helpers';

const FEATURES = 1 | 4 | 8 | 1024 | 2048 | 16384;

function config(entityId: string, remote?: string) {
  return normalizeConfig({
    type: 'custom:mediadeck-card',
    entity: entityId,
    entities: remote ? { remote } : {},
  });
}

describe('actions', () => {
  test('volume targets AVR', async () => {
    const home = hass([
      entity('media_player.tv', 'playing', { supported_features: FEATURES }),
      entity('media_player.avr', 'on', { supported_features: FEATURES }),
    ]);
    const session = resolveMediaSession(
      home,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { audio: 'media_player.avr' },
      }),
    );
    expect((await executeIntent(home, session, { kind: 'volume-set', volume: 0.35 })).ok).toBe(
      true,
    );
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'media_player',
      service: 'volume_set',
      target: { entity_id: 'media_player.avr' },
    });
  });

  test('power can target a remote entity independently from the primary media player', async () => {
    const home = hass([
      entity('media_player.tv', 'off', { supported_features: FEATURES }),
      entity('remote.tv', 'off'),
    ]);
    const session = resolveMediaSession(
      home,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { power: 'remote.tv' } as any,
      }),
    );

    expect((await executeIntent(home, session, { kind: 'power', on: true })).ok).toBe(true);
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'remote',
      service: 'turn_on',
      target: { entity_id: 'remote.tv' },
    });
  });

  test('custom power action overrides the automatic entity power service', async () => {
    const home = hass([
      entity('media_player.tv', 'off', { supported_features: FEATURES }),
      entity('remote.tv', 'off'),
    ]);
    const session = resolveMediaSession(
      home,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { power: 'remote.tv' } as any,
        power_actions: {
          on: { action: 'call-service', service: 'script.wake_sitting_room_tv' },
        },
      } as any),
    );

    expect((await executeIntent(home, session, { kind: 'power', on: true })).ok).toBe(true);
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'script',
      service: 'wake_sitting_room_tv',
    });
  });

  test('generic remote navigation uses remote.send_command', async () => {
    const home = hass([
      entity('media_player.tv', 'playing', { supported_features: FEATURES }),
      entity('remote.tv', 'on'),
    ]);
    const session = resolveMediaSession(home, config('media_player.tv', 'remote.tv'));
    expect((await executeIntent(home, session, { kind: 'remote', command: 'HOME' })).ok).toBe(true);
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'remote',
      service: 'send_command',
      data: { command: 'HOME' },
    });
  });

  test('Android TV Remote uses DPAD commands and text: keyboard input', async () => {
    const home = hass([
      entity('media_player.android_tv', 'playing', {
        integration: 'androidtv_remote',
        supported_features: FEATURES,
      }),
      entity('remote.android_tv', 'on', { integration: 'androidtv_remote' }),
    ]);
    const session = resolveMediaSession(
      home,
      config('media_player.android_tv', 'remote.android_tv'),
    );
    await executeIntent(home, session, { kind: 'remote', command: 'UP' });
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'remote',
      service: 'send_command',
      data: { command: 'DPAD_UP' },
    });
    await executeIntent(home, session, { kind: 'text', text: 'Foundation' });
    expect(home.calls.at(-1)).toMatchObject({ data: { command: 'text:Foundation' } });
  });

  test('Apple TV remote commands are translated to pyatv command names', async () => {
    const home = hass([
      entity('media_player.apple_tv', 'playing', {
        model: 'Apple TV 4K',
        supported_features: FEATURES,
      }),
      entity('remote.apple_tv', 'on'),
    ]);
    const session = resolveMediaSession(home, config('media_player.apple_tv', 'remote.apple_tv'));
    await executeIntent(home, session, { kind: 'remote', command: 'SELECT' });
    expect(home.calls.at(-1)).toMatchObject({ data: { command: 'select' } });
    await executeIntent(home, session, { kind: 'remote', command: 'BACK' });
    expect(home.calls.at(-1)).toMatchObject({ data: { command: 'menu' } });
  });

  test('Samsung TV remote commands use Samsung key codes', async () => {
    const home = hass([
      entity('media_player.samsung_tv', 'playing', {
        manufacturer: 'Samsung',
        supported_features: FEATURES,
      }),
      entity('remote.samsung_tv', 'on'),
    ]);
    const session = resolveMediaSession(
      home,
      config('media_player.samsung_tv', 'remote.samsung_tv'),
    );
    await executeIntent(home, session, { kind: 'remote', command: 'RIGHT' });
    expect(home.calls.at(-1)).toMatchObject({ data: { command: 'KEY_RIGHT' } });
    await executeIntent(home, session, { kind: 'remote', command: 'SELECT' });
    expect(home.calls.at(-1)).toMatchObject({ data: { command: 'KEY_ENTER' } });
  });

  test('LG webOS navigation uses webostv.button without requiring a remote entity', async () => {
    const home = hass([
      entity('media_player.lg_webos_tv', 'on', {
        integration: 'webostv',
        manufacturer: 'LG',
        supported_features: FEATURES,
      }),
    ]);
    const session = resolveMediaSession(home, config('media_player.lg_webos_tv'));
    expect(session.capabilities.remoteNavigation).toBe(true);
    expect((await executeIntent(home, session, { kind: 'remote', command: 'SELECT' })).ok).toBe(
      true,
    );
    expect(home.calls.at(-1)).toMatchObject({
      domain: 'webostv',
      service: 'button',
      data: { button: 'ENTER' },
      target: { entity_id: 'media_player.lg_webos_tv' },
    });
  });

  test('custom action stays declarative', async () => {
    const home = hass([entity('media_player.tv', 'playing', { supported_features: FEATURES })]);
    const session = resolveMediaSession(home, config('media_player.tv'));
    await executeIntent(home, session, {
      kind: 'custom',
      action: { action: 'call-service', service: 'script.watch_tv', data: { mode: 'movie' } },
    });
    expect(home.calls.at(-1)).toMatchObject({ domain: 'script', service: 'watch_tv' });
  });

  test('service failures return structured error', async () => {
    const home = hass([entity('media_player.tv', 'playing', { supported_features: FEATURES })]);
    home.callService = async () => {
      throw new Error('boom');
    };
    const session = resolveMediaSession(home, config('media_player.tv'));
    expect(await executeIntent(home, session, { kind: 'play-pause' })).toMatchObject({
      ok: false,
      message: 'boom',
    });
  });
});
