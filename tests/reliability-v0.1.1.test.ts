import { afterEach, describe, expect, test, vi } from 'vitest';
import '../src/index';
import { normalizeConfig } from '../src/config/defaults';
import { validateConfig } from '../src/config/validate';
import { resolveMediaSession } from '../src/session/resolve-session';
import { entity, hass } from './helpers';

const PLAY = 16384;
const PAUSE = 1;
const SEEK = 2;
const VOLUME_SET = 4;
const VOLUME_MUTE = 8;
const VOLUME_STEP = 1024;
const SELECT_SOURCE = 2048;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('v0.1.1 reliability regressions', () => {
  test('keeps an unavailable explicit source mapping instead of switching to an unrelated player', () => {
    const h = hass([
      entity('media_player.tv', 'on', { source: 'HDMI 1', supported_features: SELECT_SOURCE }),
      entity('media_player.apple_tv', 'unavailable'),
      entity('media_player.shield', 'playing', { supported_features: PLAY | PAUSE }),
    ]);
    const session = resolveMediaSession(
      h,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { related: ['media_player.shield'] },
        source_mappings: { 'HDMI 1': { entity: 'media_player.apple_tv' } },
      }),
    );
    expect(session.active?.entity_id).toBe('media_player.apple_tv');
    expect(session.state).toBe('unavailable');
    expect(session.reason).toBe('explicit-source-mapping-unavailable:HDMI 1');
  });

  test('prefers built-in playback on the primary TV over a paused unrelated player', () => {
    const h = hass([
      entity('media_player.tv', 'playing', {
        source: 'Netflix',
        app_name: 'Netflix',
        supported_features: PLAY | PAUSE | SELECT_SOURCE,
      }),
      entity('media_player.apple_tv', 'paused', { supported_features: PLAY | PAUSE }),
    ]);
    const session = resolveMediaSession(
      h,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { related: ['media_player.apple_tv'] },
      }),
    );
    expect(session.active?.entity_id).toBe('media_player.tv');
    expect(session.reason).toBe('primary-playback');
  });

  test('calculates source, transport and audio capabilities from their actual destinations', () => {
    const h = hass([
      entity('media_player.tv', 'on', { source: 'HDMI 1', supported_features: SELECT_SOURCE }),
      entity('media_player.apple_tv', 'playing', { supported_features: PLAY | PAUSE }),
      entity('media_player.avr', 'on', { supported_features: VOLUME_STEP | VOLUME_MUTE }),
    ]);
    const session = resolveMediaSession(
      h,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { audio: 'media_player.avr' },
        source_mappings: { 'HDMI 1': { entity: 'media_player.apple_tv' } },
      }),
    );
    expect(session.capabilities.sourceSelect).toBe(true);
    expect(session.capabilities.playPause).toBe(true);
    expect(session.capabilities.volumeSet).toBe(false);
    expect(session.capabilities.volumeStep).toBe(true);
    expect(session.capabilities.mute).toBe(true);
  });

  test('supports an explicit Android TV platform override when entity names are generic', () => {
    const h = hass([
      entity('media_player.shield', 'playing', { supported_features: PLAY | PAUSE }),
      entity('remote.shield', 'on'),
    ]);
    const session = resolveMediaSession(
      h,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.shield',
        entities: { remote: 'remote.shield' },
        platform: 'android-tv',
      } as any),
    );
    expect(session.adapter.id).toBe('android-tv');
    expect(session.capabilities.textEntry).toBe(true);
  });

  test('nested malformed configuration is rejected without throwing during validation', () => {
    const malformed = {
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      entities: { related: 'media_player.box' },
      source_mappings: { 'HDMI 1': ['media_player.box'] },
      watch_actions: 'not-an-array',
      section_order: ['now_playing', 42],
      appearance: { opacity: 'opaque' },
    };
    expect(() => validateConfig(malformed)).not.toThrow();
    const result = validateConfig(malformed);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  test('honours configured section order in the rendered card', async () => {
    const card = document.createElement('mediadeck-card') as any;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      entities: { audio: 'media_player.avr' },
      section_order: ['audio', 'now_playing', 'transport', 'remote', 'sources', 'watch_actions', 'inspector'],
    });
    card.hass = hass([
      entity('media_player.tv', 'playing', { supported_features: PLAY | PAUSE }),
      entity('media_player.avr', 'on', { supported_features: VOLUME_STEP }),
    ]);
    document.body.append(card);
    await card.updateComplete;
    const sections = [...card.shadowRoot.querySelectorAll('.card-body section')].map((section: Element) =>
      section.className,
    );
    expect(sections[0]).toContain('audio-panel');
    expect(sections[1]).toContain('now-playing');
  });

  test('preserves a locally dragged volume value across incoming Home Assistant updates', async () => {
    const card = document.createElement('mediadeck-card') as any;
    card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
    card.hass = hass([
      entity('media_player.tv', 'playing', {
        supported_features: PLAY | PAUSE | VOLUME_SET,
        volume_level: 0.3,
      }),
    ]);
    document.body.append(card);
    await card.updateComplete;
    let slider = card.shadowRoot.querySelector('input[aria-label="Volume"]') as HTMLInputElement;
    slider.value = '0.8';
    slider.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    card.hass = hass([
      entity('media_player.tv', 'playing', {
        supported_features: PLAY | PAUSE | VOLUME_SET,
        volume_level: 0.3,
      }),
    ]);
    await card.updateComplete;
    slider = card.shadowRoot.querySelector('input[aria-label="Volume"]') as HTMLInputElement;
    expect(slider.value).toBe('0.8');
  });

  test('renders configured custom actions and asks for confirmation before executing them', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const h = hass([entity('media_player.tv', 'on')]);
    const card = document.createElement('mediadeck-card') as any;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      custom_actions: {
        'Open settings': {
          action: 'call-service',
          service: 'script.open_settings',
          confirmation: 'Open settings?',
        },
      },
    });
    card.hass = h;
    document.body.append(card);
    await card.updateComplete;
    const button = [...card.shadowRoot.querySelectorAll('button')].find(
      (candidate: HTMLButtonElement) => candidate.textContent?.trim() === 'Open settings',
    ) as HTMLButtonElement | undefined;
    expect(button).toBeDefined();
    button?.click();
    await Promise.resolve();
    expect(confirm).toHaveBeenCalledWith('Open settings?');
    expect(h.calls).toHaveLength(0);
  });

  test('renders an interactive seek control when the transport supports seeking', async () => {
    const card = document.createElement('mediadeck-card') as any;
    card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
    card.hass = hass([
      entity('media_player.tv', 'playing', {
        supported_features: PLAY | PAUSE | SEEK,
        media_duration: 600,
        media_position: 120,
        media_position_updated_at: new Date().toISOString(),
      }),
    ]);
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot.querySelector('input[aria-label="Seek"]')).not.toBeNull();
  });

  test('editor options include entity ids so duplicate friendly names are distinguishable', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.android_remote' });
    editor.hass = hass([
      entity('media_player.android_remote', 'on', { friendly_name: 'Sitting Room TV' }),
      entity('media_player.cast', 'idle', { friendly_name: 'Sitting Room TV' }),
    ]);
    document.body.append(editor);
    await editor.updateComplete;
    const primary = editor.shadowRoot.querySelector('select') as HTMLSelectElement;
    const labels = [...primary.options].map((option) => option.textContent ?? '');
    expect(labels.some((label) => label.includes('media_player.android_remote'))).toBe(true);
    expect(labels.some((label) => label.includes('media_player.cast'))).toBe(true);
  });
});
