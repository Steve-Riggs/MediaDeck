import type { ArtworkMedia } from './media';
export interface ArtworkSettings {
  provider?: 'home-assistant' | 'tmdb' | 'fanart';
  tmdb_api_key?: string;
  fanart_api_key?: string;
  fanart_client_key?: string;
  image_type?: 'poster' | 'backdrop';
  language?: string;
  fallback?: boolean;
}
export interface ArtworkResult {
  url?: string;
  provider?: string;
  message?: string;
}
const cleanTitle = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
async function json(url: URL): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) throw new Error('Artwork request failed');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
function tmdbUrl(path: string, settings: ArtworkSettings): URL {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set('api_key', settings.tmdb_api_key!);
  url.searchParams.set('language', settings.language ?? 'en');
  return url;
}
export class ArtworkLookup {
  private cache = new Map<string, { expires: number; result: Promise<ArtworkResult> }>();
  lookup(media: ArtworkMedia, settings: ArtworkSettings): Promise<ArtworkResult> {
    if (!settings.provider || settings.provider === 'home-assistant') return Promise.resolve({});
    const key = JSON.stringify([media, settings]);
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
    const result = this.resolve(media, settings).catch(() => ({
      message: 'Artwork service unavailable. Check the API keys, connection and browser access.',
    }));
    this.cache.set(key, { expires: Date.now() + 5 * 60 * 1000, result });
    if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
  private async resolve(media: ArtworkMedia, settings: ArtworkSettings): Promise<ArtworkResult> {
    if (settings.provider === 'fanart' && !settings.fanart_api_key)
      return { message: 'Enter a Fanart.tv project API key.' };
    let kind = media.kind;
    let tmdbId = media.tmdbId;
    let tvdbId = media.tvdbId;
    const directFanart =
      settings.provider === 'fanart' &&
      ((kind === 'tv' && tvdbId) || (kind === 'movie' && (tmdbId || media.imdbId)));
    if (!directFanart && (!kind || !tmdbId)) {
      if (!settings.tmdb_api_key)
        return { message: 'Enter a TMDB API key to match the film or series title.' };
      const url = tmdbUrl('search/multi', settings);
      url.searchParams.set('query', media.title);
      url.searchParams.set('include_adult', 'false');
      const search = await json(url);
      const matches = (Array.isArray(search.results) ? search.results : []).filter(
        (item: any) =>
          ['movie', 'tv'].includes(item.media_type) &&
          (!kind || item.media_type === kind) &&
          [item.title, item.name, item.original_title, item.original_name].some(
            (value) => typeof value === 'string' && cleanTitle(value) === cleanTitle(media.title),
          ) &&
          (!media.year || String(item.release_date ?? item.first_air_date).startsWith(media.year)),
      );
      if (matches.length !== 1)
        return {
          message: matches.length
            ? 'Title matches multiple items. Provide the year or a content ID.'
            : 'No matching film or series found.',
        };
      kind = matches[0].media_type;
      tmdbId = String(matches[0].id);
    }
    if (settings.provider === 'tmdb') {
      if (!settings.tmdb_api_key) return { message: 'Enter a TMDB API key.' };
      const details = await json(tmdbUrl(`${kind}/${tmdbId}`, settings));
      const path = settings.image_type === 'backdrop' ? details.backdrop_path : details.poster_path;
      return typeof path === 'string' && /^\/[a-z0-9_.-]+$/i.test(path)
        ? { url: `https://image.tmdb.org/t/p/w500${path}`, provider: 'TMDB' }
        : { message: 'No artwork available for this title.' };
    }
    if (kind === 'tv' && !tvdbId) {
      if (!settings.tmdb_api_key)
        return { message: 'A TMDB API key is needed to find the series TVDB ID.' };
      const ids = await json(tmdbUrl(`tv/${tmdbId}/external_ids`, settings));
      if (ids.tvdb_id) tvdbId = String(ids.tvdb_id);
      else return { message: 'No TVDB ID is available for this series.' };
    }
    const id = kind === 'tv' ? tvdbId : (tmdbId ?? media.imdbId);
    const url = new URL(`https://webservice.fanart.tv/v3/${kind === 'tv' ? 'tv' : 'movies'}/${id}`);
    url.searchParams.set('api_key', settings.fanart_api_key!);
    if (settings.fanart_client_key) url.searchParams.set('client_key', settings.fanart_client_key);
    const data = await json(url);
    const field =
      settings.image_type === 'backdrop'
        ? kind === 'tv'
          ? 'showbackground'
          : 'moviebackground'
        : kind === 'tv'
          ? 'tvposter'
          : 'movieposter';
    const images = (Array.isArray(data[field]) ? data[field] : []).filter((image: any) => {
      try {
        return (
          new URL(image.url).protocol === 'https:' &&
          new URL(image.url).hostname === 'assets.fanart.tv'
        );
      } catch {
        return false;
      }
    });
    const language = (settings.language ?? 'en').split('-')[0];
    images.sort((a: any, b: any) => {
      const score = (image: any) =>
        image.lang === language ? 2 : ['00', ''].includes(image.lang) ? 1 : 0;
      return score(b) - score(a) || Number(b.likes ?? 0) - Number(a.likes ?? 0);
    });
    return images[0]
      ? { url: images[0].url, provider: 'Fanart.tv' }
      : { message: 'No artwork available for this title.' };
  }
}
