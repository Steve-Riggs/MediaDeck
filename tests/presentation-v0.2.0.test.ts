import { afterEach, expect, test } from 'vitest';
import '../src/index';
import { MediaDeckCard } from '../src/mediadeck-card';
import { MediaDeckEditor } from '../src/mediadeck-editor';
import { normalizeConfig, DEFAULT_APPEARANCE } from '../src/config/defaults';
import { entity, hass } from './helpers';
afterEach(() => {
  document.body.innerHTML = '';
});

test.each([
  ['com.amazon.amazonvideo', 'Prime Video'],
  ['com.disney.disneyplus', 'Disney+'],
  ['com.netflix.ninja', 'Netflix'],
])('shows a friendly name for %s without changing the launch ID', async (id, name) => {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
  const home = hass([
    entity('media_player.tv', 'on', {
      media_title: id,
      app_name: id,
      source: id,
      source_list: [id],
      supported_features: 2048,
    }),
  ]);
  card.hass = home;
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.now-playing')!.textContent).toContain(name);
  expect(card.shadowRoot!.querySelector('.now-playing')!.textContent).not.toContain(id);
  const select = card.shadowRoot!.querySelector('.source-panel select') as HTMLSelectElement;
  expect(select.options[0].textContent).toContain(name);
  expect(select.options[0].value).toBe(id);
  select.value = id;
  select.dispatchEvent(new Event('change'));
  expect(home.calls[0]).toMatchObject({ data: { source: id } });
});

test('custom app names override built-in mappings', async () => {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    app_names: { 'com.example.player': 'My player' },
  });
  card.hass = hass([entity('media_player.tv', 'on', { app_name: 'com.example.player' })]);
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot!.textContent).toContain('My player');
});

test('hidden sections leave no empty region in the layout', async () => {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    regions: { sources: false, remote: false },
  });
  card.hass = hass([
    entity('media_player.tv', 'on', { source_list: ['HDMI 1'], supported_features: 2048 }),
  ]);
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.region-sources')).toBeNull();
  expect(card.shadowRoot!.querySelector('.region-remote')).toBeNull();
  expect(card.shadowRoot!.querySelector('.region-watch_actions')).toBeNull();
});

test('undefined appearance fields restore theme defaults', () => {
  const c = normalizeConfig({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    appearance: { background: undefined, text_color: undefined },
  });
  expect(c.appearance.background).toBe(DEFAULT_APPEARANCE.background);
  expect(c.appearance.text_color).toBe(DEFAULT_APPEARANCE.text_color);
});

test('editor offers artwork providers and simple appearance controls', async () => {
  const editor = document.createElement('mediadeck-editor') as MediaDeckEditor;
  editor.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
  editor.hass = hass([entity('media_player.tv')]);
  document.body.append(editor);
  await editor.updateComplete;
  const select = editor.shadowRoot!.querySelector(
    'select[aria-label="Artwork source"]',
  ) as HTMLSelectElement;
  expect(select).not.toBeNull();
  expect([...select.options].map((x) => x.textContent?.trim())).toEqual([
    'Home Assistant',
    'TMDB',
    'Fanart.tv',
  ]);
  expect(editor.shadowRoot!.querySelector('input[type="color"]')).not.toBeNull();
  expect(editor.shadowRoot!.textContent).toContain('Reset appearance');
});

test('broken Home Assistant artwork falls back to the app tile', async () => {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
  card.hass = hass([
    entity('media_player.tv', 'on', {
      app_name: 'com.disney.disneyplus',
      entity_picture: '/broken.jpg',
    }),
  ]);
  document.body.append(card);
  await card.updateComplete;
  card.shadowRoot!.querySelector('.artwork img')!.dispatchEvent(new Event('error'));
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.artwork img')).toBeNull();
  expect(card.shadowRoot!.querySelector('.artwork')!.textContent).toContain('Disney+');
});
