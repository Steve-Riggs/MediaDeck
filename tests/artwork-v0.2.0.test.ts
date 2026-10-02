import { afterEach, expect, test, vi } from 'vitest';
import { ArtworkLookup } from '../src/artwork/lookup';
import { getArtworkMedia } from '../src/artwork/media';
import { entity } from './helpers';
afterEach(() => vi.unstubAllGlobals());
const movie = { title: 'Fight Club', kind: 'movie' as const, tmdbId: '550' };
function api(responses: unknown[]) {
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (input: string) => {
    requests.push(input);
    if (!responses.length) throw new Error('Unexpected extra request');
    return { ok: true, json: async () => responses.shift() };
  });
  return requests;
}
test('Home Assistant selection makes no lookup requests', async () => {
  const requests = api([]);
  const result = await new ArtworkLookup().lookup(movie, { provider: 'home-assistant' });
  expect(requests).toHaveLength(0);
  expect(result.url).toBeUndefined();
});
test('Fanart movie lookup uses TMDB ID and caches the result', async () => {
  const requests = api([
    {
      movieposter: [
        { url: 'https://assets.fanart.tv/fanart/fight-club.jpg', lang: 'en', likes: '4' },
      ],
    },
  ]);
  const lookup = new ArtworkLookup();
  const config = { provider: 'fanart' as const, fanart_api_key: 'project-key' };
  const first = await lookup.lookup(movie, config);
  const second = await lookup.lookup(movie, config);
  expect(first.url).toBe('https://assets.fanart.tv/fanart/fight-club.jpg');
  expect(second).toEqual(first);
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0]).pathname).toBe('/v3/movies/550');
  expect(new URL(requests[0]).searchParams.get('api_key')).toBe('project-key');
});
test('Fanart TV lookup uses the series TVDB ID', async () => {
  const requests = api([
    { tvposter: [{ url: 'https://assets.fanart.tv/fanart/show.jpg', lang: 'en' }] },
  ]);
  const result = await new ArtworkLookup().lookup(
    { title: 'Foundation', kind: 'tv', tvdbId: '366972' },
    { provider: 'fanart', fanart_api_key: 'project-key' },
  );
  expect(result.url).toBe('https://assets.fanart.tv/fanart/show.jpg');
  expect(new URL(requests[0]).pathname).toBe('/v3/tv/366972');
});
test('title lookup resolves a TV series through TMDB before querying Fanart', async () => {
  const requests = api([
    { results: [{ id: 93740, name: 'Foundation', media_type: 'tv' }] },
    { tvdb_id: 366972 },
    { showbackground: [{ url: 'https://assets.fanart.tv/fanart/background.jpg', lang: 'en' }] },
  ]);
  const result = await new ArtworkLookup().lookup(
    { title: 'Foundation', kind: 'tv' },
    {
      provider: 'fanart',
      tmdb_api_key: 'tmdb-key',
      fanart_api_key: 'project-key',
      image_type: 'backdrop',
    },
  );
  expect(result.url).toContain('background.jpg');
  expect(new URL(requests[0]).searchParams.get('query')).toBe('Foundation');
  expect(new URL(requests[1]).pathname).toBe('/3/tv/93740/external_ids');
  expect(new URL(requests[2]).pathname).toBe('/v3/tv/366972');
});
test('ambiguous title matches do not select arbitrary artwork', async () => {
  const requests = api([
    {
      results: [
        { id: 1, title: 'Dune', media_type: 'movie' },
        { id: 2, title: 'Dune', media_type: 'movie' },
      ],
    },
  ]);
  const result = await new ArtworkLookup().lookup(
    { title: 'Dune', kind: 'movie' },
    { provider: 'tmdb', tmdb_api_key: 'key' },
  );
  expect(result.url).toBeUndefined();
  expect(result.message).toContain('multiple');
  expect(requests).toHaveLength(1);
});
test('lookup failures return a status without leaking credential URLs', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new Error('https://example?api_key=secret');
  });
  const result = await new ArtworkLookup().lookup(movie, {
    provider: 'fanart',
    fanart_api_key: 'secret',
  });
  expect(result.url).toBeUndefined();
  expect(result.message).not.toContain('secret');
  expect(result.message).toContain('unavailable');
});
test('app-only metadata is never used as a movie search query', () => {
  expect(
    getArtworkMedia(
      entity('media_player.tv', 'on', {
        media_title: 'com.disney.disneyplus',
        app_name: 'Disney+',
      }),
    ),
  ).toBeUndefined();
  expect(
    getArtworkMedia(
      entity('media_player.tv', 'on', { media_title: 'Netflix', app_name: 'Netflix' }),
    ),
  ).toBeUndefined();
});
test('series artwork is identified by series title rather than episode title', () => {
  expect(
    getArtworkMedia(
      entity('media_player.tv', 'playing', {
        media_title: "The Emperor's Peace",
        media_series_title: 'Foundation',
        media_content_type: 'episode',
      }),
    ),
  ).toMatchObject({ title: 'Foundation', kind: 'tv' });
});
test('TMDB selection retrieves poster artwork for a known movie ID', async () => {
  const requests = api([{ poster_path: '/poster.jpg' }]);
  const result = await new ArtworkLookup().lookup(movie, { provider: 'tmdb', tmdb_api_key: 'key' });
  expect(result.url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
  expect(new URL(requests[0]).pathname).toBe('/3/movie/550');
});
