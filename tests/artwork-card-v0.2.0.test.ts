import { afterEach, expect, test, vi } from 'vitest';
import '../src/index';
import { MediaDeckCard } from '../src/mediadeck-card';
import { MediaDeckEditor } from '../src/mediadeck-editor';
import { validateConfig } from '../src/config/validate';
import { entity, hass } from './helpers';
afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
function mount(provider: 'home-assistant' | 'tmdb' | 'fanart', fallback = true) {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    artwork: { provider, fallback, tmdb_api_key: 'key', fanart_api_key: 'project-key' },
  });
  card.hass = hass([
    entity('media_player.tv', 'playing', {
      media_title: 'Fight Club',
      media_content_type: 'movie',
      tmdb_id: 550,
      entity_picture: '/ha.jpg',
    }),
  ]);
  document.body.append(card);
  return card;
}
test('Home Assistant provider never sends titles to external services', async () => {
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    throw Error('Must not fetch');
  });
  const card = mount('home-assistant');
  await card.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  expect(requests).toHaveLength(0);
  expect(card.shadowRoot!.querySelector('.artwork img')!.getAttribute('src')).toBe('/ha.jpg');
});
test('late lookup cannot replace Home Assistant artwork after provider changes', async () => {
  let finish: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const card = mount('tmdb');
  await card.updateComplete;
  card.setConfig({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    artwork: { provider: 'home-assistant' },
  });
  await card.updateComplete;
  finish({ ok: true, json: async () => ({ poster_path: '/late.jpg' }) });
  await new Promise((r) => setTimeout(r, 0));
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.artwork img')!.getAttribute('src')).toBe('/ha.jpg');
});
test.each([true, false])('lookup failure honours fallback=%s', async (fallback) => {
  vi.stubGlobal('fetch', async () => {
    throw new Error('offline');
  });
  const card = mount('tmdb', fallback);
  await card.updateComplete;
  await vi.waitFor(() =>
    expect(card.shadowRoot!.querySelector('.artwork-status')!.textContent).toContain('unavailable'),
  );
  expect(card.shadowRoot!.querySelector('.artwork img')?.getAttribute('src')).toBe(
    fallback ? '/ha.jpg' : undefined,
  );
});
test('selected Fanart artwork replaces HA artwork and failed image restores HA artwork', async () => {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    json: async () => ({
      movieposter: [{ url: 'https://assets.fanart.tv/fanart/poster.jpg', lang: 'en' }],
    }),
  }));
  const card = mount('fanart');
  await card.updateComplete;
  await vi.waitFor(() =>
    expect(card.shadowRoot!.querySelector('.artwork img')!.getAttribute('src')).toContain(
      'fanart.tv',
    ),
  );
  card.shadowRoot!.querySelector('.artwork img')!.dispatchEvent(new Event('error'));
  await card.updateComplete;
  expect(card.shadowRoot!.querySelector('.artwork img')!.getAttribute('src')).toBe('/ha.jpg');
});
test('provider selection exposes only relevant key fields and preserves its selection on update', async () => {
  const editor = document.createElement('mediadeck-editor') as MediaDeckEditor;
  editor.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
  editor.hass = hass([entity('media_player.tv')]);
  document.body.append(editor);
  await editor.updateComplete;
  let select = editor.shadowRoot!.querySelector(
    '[aria-label="Artwork source"]',
  ) as HTMLSelectElement;
  select.value = 'fanart';
  select.dispatchEvent(new Event('change'));
  await editor.updateComplete;
  select = editor.shadowRoot!.querySelector('[aria-label="Artwork source"]') as HTMLSelectElement;
  expect(select.value).toBe('fanart');
  expect(editor.shadowRoot!.textContent).toContain('Fanart.tv project API key');
  expect(editor.shadowRoot!.querySelectorAll('input[type=password]')).toHaveLength(3);
});
test.each([
  { provider: 'bad' },
  { provider: 'fanart', fallback: 'yes' },
  { provider: 'fanart', fanart_api_key: 99 },
])('rejects malformed artwork config %j', (artwork) => {
  expect(
    validateConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv', artwork }).valid,
  ).toBe(false);
});
