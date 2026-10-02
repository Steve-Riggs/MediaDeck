import type { HassEntity } from '../types/home-assistant';
import { appName, isAppTitle } from '../media/app-names';
export interface ArtworkMedia {
  title: string;
  kind?: 'movie' | 'tv';
  tmdbId?: string;
  tvdbId?: string;
  imdbId?: string;
  year?: string;
}
const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;
const numericId = (value: unknown) => (/^\d+$/.test(String(value)) ? String(value) : undefined);
export function getArtworkMedia(entity?: HassEntity): ArtworkMedia | undefined {
  if (!entity || ['off', 'unknown', 'unavailable', 'standby'].includes(entity.state))
    return undefined;
  const a = entity.attributes;
  const series = text(a.media_series_title);
  const title = series ?? text(a.media_title);
  if (!title || isAppTitle(title) || title.toLowerCase() === appName(a.app_name).toLowerCase())
    return undefined;
  const contentType = text(a.media_content_type);
  const kind =
    series || ['episode', 'tvshow', 'tv'].includes(contentType ?? '')
      ? 'tv'
      : contentType === 'movie'
        ? 'movie'
        : undefined;
  const year = /^\d{4}$/.test(String(a.media_year)) ? String(a.media_year) : undefined;
  return {
    title,
    kind,
    tmdbId: numericId(a.tmdb_id),
    tvdbId: numericId(a.tvdb_id),
    imdbId: /^tt\d+$/.test(String(a.imdb_id)) ? String(a.imdb_id) : undefined,
    year,
  };
}
