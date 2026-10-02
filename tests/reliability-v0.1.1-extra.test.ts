import { afterEach, describe, expect, test } from 'vitest';
import '../src/index';
import { normalizeConfig } from '../src/config/defaults';
import { discoverMediaRelationships } from '../src/discovery/discover';
import { resolveMediaSession } from '../src/session/resolve-session';
import type { EntityRegistryMap } from '../src/registry/entity-registry';
import { entity, hass } from './helpers';

const PLAY = 16384;
const PAUSE = 1;
const VOLUME_SET = 4;

afterEach(() => {
  document.body.innerHTML = '';
});

function selectForLabel(root: ShadowRoot, text: string): HTMLSelectElement {
  const label = [...root.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  const select = label?.querySelector('select');
  if (!select) throw new Error(`Select labelled ${text} was not found.`);
  return select;
}

describe('v0.1.1 additional reliability coverage', () => {
  test('detects Android TV from Home Assistant registry platform metadata', () => {
    const h = hass([
      entity('media_player.shield', 'playing', { supported_features: PLAY | PAUSE }),
      entity('remote.shield', 'on'),
    ]);
    const registry: EntityRegistryMap = {
      'media_player.shield': {
        entity_id: 'media_player.shield',
        platform: 'androidtv_remote',
        device_id: 'device-shield',
      },
      'remote.shield': {
        entity_id: 'remote.shield',
        platform: 'androidtv_remote',
        device_id: 'device-shield',
      },
    };
    const session = resolveMediaSession(
      h,
      normalizeConfig({
        type: 'custom:mediadeck-card',
        entity: 'media_player.shield',
        entities: { remote: 'remote.shield' },
      }),
      registry,
    );
    expect(session.adapter.id).toBe('android-tv');
    expect(session.capabilities.textEntry).toBe(true);
  });

  test('binds configured entity selectors to the actual configured values', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.primary',
      entities: {
        metadata: 'media_player.cast',
        transport: 'media_player.remote_player',
        remote: 'remote.streamer',
        audio: 'media_player.avr',
      },
    });
    editor.hass = hass([
      entity('media_player.primary', 'on', { friendly_name: 'Sitting Room TV' }),
      entity('media_player.cast', 'idle', { friendly_name: 'Sitting Room TV' }),
      entity('media_player.remote_player', 'idle', { friendly_name: 'Sitting Room TV' }),
      entity('media_player.avr', 'on', { friendly_name: 'Main Speakers' }),
      entity('remote.streamer', 'on', { friendly_name: 'Sitting Room TV' }),
    ]);
    document.body.append(editor);
    await editor.updateComplete;
    expect(selectForLabel(editor.shadowRoot, 'Primary media entity').value).toBe(
      'media_player.primary',
    );
    expect(selectForLabel(editor.shadowRoot, 'Metadata entity').value).toBe('media_player.cast');
    expect(selectForLabel(editor.shadowRoot, 'Transport entity').value).toBe(
      'media_player.remote_player',
    );
    expect(selectForLabel(editor.shadowRoot, 'Remote entity').value).toBe('remote.streamer');
    expect(selectForLabel(editor.shadowRoot, 'Audio / AVR entity').value).toBe('media_player.avr');
  });

  test('binds each HDMI source mapping to its own configured entity', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      source_mappings: {
        'HDMI 1': { entity: 'media_player.apple_tv' },
        'HDMI 2': { entity: 'media_player.google_tv' },
      },
    });
    editor.hass = hass([
      entity('media_player.tv', 'on', { source_list: ['HDMI 1', 'HDMI 2'] }),
      entity('media_player.apple_tv', 'idle'),
      entity('media_player.google_tv', 'idle'),
    ]);
    document.body.append(editor);
    await editor.updateComplete;
    expect(
      (
        editor.shadowRoot.querySelector(
          'select[aria-label="HDMI 1 playback entity"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('media_player.apple_tv');
    expect(
      (
        editor.shadowRoot.querySelector(
          'select[aria-label="HDMI 2 playback entity"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('media_player.google_tv');
  });

  test('keeps a dragged volume draft when a different HA value arrives', async () => {
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
    await card.updateComplete;
    card.hass = hass([
      entity('media_player.tv', 'playing', {
        supported_features: PLAY | PAUSE | VOLUME_SET,
        volume_level: 0.4,
      }),
    ]);
    await card.updateComplete;
    slider = card.shadowRoot.querySelector('input[aria-label="Volume"]') as HTMLInputElement;
    expect(slider.value).toBe('0.8');
  });

  test('discovers dissimilarly named entities that belong to the same HA device', () => {
    const h = hass([
      entity('media_player.lounge_display', 'on', { friendly_name: 'Cinema Screen' }),
      entity('media_player.cast_abc123', 'idle', { friendly_name: 'Chromecast' }),
      entity('remote.gtv_123', 'on', { friendly_name: 'Remote' }),
    ]);
    const registry: EntityRegistryMap = {
      'media_player.lounge_display': {
        entity_id: 'media_player.lounge_display',
        platform: 'androidtv_remote',
        device_id: 'device-1',
        area_id: 'living_room',
      },
      'media_player.cast_abc123': {
        entity_id: 'media_player.cast_abc123',
        platform: 'cast',
        device_id: 'device-1',
        area_id: 'living_room',
      },
      'remote.gtv_123': {
        entity_id: 'remote.gtv_123',
        platform: 'androidtv_remote',
        device_id: 'device-1',
        area_id: 'living_room',
      },
    };
    const suggestions = discoverMediaRelationships(
      h,
      normalizeConfig({ type: 'custom:mediadeck-card', entity: 'media_player.lounge_display' }),
      registry,
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ kind: 'media-player', entity: 'media_player.cast_abc123' }),
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ kind: 'remote', entity: 'remote.gtv_123' }),
    );
  });

  test('density setting changes the card presentation class', async () => {
    const card = document.createElement('mediadeck-card') as any;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      appearance: { density: 'compact' },
    });
    card.hass = hass([entity('media_player.tv', 'on')]);
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot.querySelector('article')?.classList.contains('density-compact')).toBe(
      true,
    );
  });

  test('editor uses registry platform labels to distinguish duplicate friendly names', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.android_remote' });
    const h = hass([
      entity('media_player.android_remote', 'on', { friendly_name: 'Sitting Room TV' }),
      entity('media_player.cast', 'idle', { friendly_name: 'Sitting Room TV' }),
    ]);
    h.callWS = async () => [
      { ei: 'media_player.android_remote', pl: 'androidtv_remote', di: 'device-1' },
      { ei: 'media_player.cast', pl: 'cast', di: 'device-1' },
    ];
    editor.hass = h;
    document.body.append(editor);
    await editor.updateComplete;
    await Promise.resolve();
    await editor.updateComplete;
    const primary = selectForLabel(editor.shadowRoot, 'Primary media entity');
    const labels = [...primary.options].map((option) => option.textContent ?? '');
    expect(labels.some((label) => label.includes('androidtv_remote'))).toBe(true);
    expect(labels.some((label) => label.includes('cast'))).toBe(true);
  });
});
