import { describe, expect, test } from 'vitest';
import { MediaDeckCard } from '../src/index';
import { entity, hass } from './helpers';

const FEATURES = 1 | 4 | 8 | 16 | 32 | 1024 | 2048 | 4096 | 16384;

describe('MediaDeck card', () => {
  test('registers card and editor', () => {
    expect(customElements.get('mediadeck-card')).toBe(MediaDeckCard);
    expect(customElements.get('mediadeck-editor')).toBeDefined();
    expect(window.customCards?.some((card) => card.type === 'mediadeck-card')).toBe(true);
  });

  test('renders loading before hass', async () => {
    const card = document.createElement('mediadeck-card') as MediaDeckCard;
    card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot?.textContent).toContain('Loading Home Assistant');
  });

  test('renders missing entity', async () => {
    const card = document.createElement('mediadeck-card') as MediaDeckCard;
    card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.missing' });
    card.hass = hass([]);
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot?.textContent).toContain('was not found');
  });

  test('renders mapped source and inspector', async () => {
    const card = document.createElement('mediadeck-card') as MediaDeckCard;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      regions: { inspector: true },
      source_mappings: {
        'HDMI 1': {
          entity: 'media_player.apple_tv',
          remote: 'remote.apple_tv',
          label: 'Apple TV',
        },
      },
      entities: { remote: 'remote.apple_tv' },
    });
    card.hass = hass([
      entity('media_player.tv', 'on', {
        friendly_name: 'TV',
        source: 'HDMI 1',
        source_list: ['HDMI 1'],
        supported_features: FEATURES,
      }),
      entity('media_player.apple_tv', 'playing', {
        friendly_name: 'Apple TV',
        media_title: 'Foundation',
        model: 'Apple TV 4K',
        supported_features: FEATURES,
      }),
      entity('remote.apple_tv', 'on'),
    ]);
    document.body.append(card);
    await card.updateComplete;
    expect(card.shadowRoot?.textContent).toContain('Foundation');
    expect(card.shadowRoot?.textContent).toContain('explicit-source-mapping:HDMI 1');
  });

  test('shows text entry for Android TV when a remote is configured', async () => {
    const card = document.createElement('mediadeck-card') as MediaDeckCard;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.android_tv',
      entities: { remote: 'remote.android_tv' },
    });
    card.hass = hass([
      entity('media_player.android_tv', 'playing', {
        friendly_name: 'Android TV',
        integration: 'androidtv',
        supported_features: FEATURES,
      }),
      entity('remote.android_tv', 'on'),
    ]);
    document.body.append(card);
    await card.updateComplete;
    expect(
      card.shadowRoot?.querySelector('input[aria-label="Send text to Android TV"]'),
    ).not.toBeNull();
  });

  test('applies configured gap, icon size and button opacity as card variables', async () => {
    const card = document.createElement('mediadeck-card') as MediaDeckCard;
    card.setConfig({
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      appearance: {
        gap: 22,
        icon_size: 31,
        button_opacity: 0.7,
      },
    });
    card.hass = hass([
      entity('media_player.tv', 'playing', {
        friendly_name: 'TV',
        supported_features: FEATURES,
      }),
    ]);
    document.body.append(card);
    await card.updateComplete;
    const article = card.shadowRoot?.querySelector('article');
    expect(article?.getAttribute('style')).toContain('--mediadeck-gap:22px');
    expect(article?.getAttribute('style')).toContain('--mediadeck-icon-size:31px');
    expect(article?.getAttribute('style')).toContain('--mediadeck-button-opacity:0.7');
  });
});