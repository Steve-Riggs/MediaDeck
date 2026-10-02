import { html, nothing, type TemplateResult } from 'lit';
import type { MediaIntent } from '../actions/types';
import type { ResolvedMediaSession } from '../session/types';
import type { NormalizedMediaDeckConfig } from '../config/types';
import { appName } from '../media/app-names';
import type { ArtworkResult } from '../artwork/lookup';

function mediaPosition(entity: ResolvedMediaSession['metadata']): number {
  if (!entity) return 0;
  let position = Number(entity.attributes.media_position ?? 0);
  if (
    entity.state === 'playing' &&
    typeof entity.attributes.media_position_updated_at === 'string'
  ) {
    const updated = Date.parse(entity.attributes.media_position_updated_at);
    if (Number.isFinite(updated)) position += Math.max(0, (Date.now() - updated) / 1000);
  }
  const duration = Number(entity.attributes.media_duration ?? 0);
  return duration > 0 ? Math.min(duration, Math.max(0, position)) : Math.max(0, position);
}

export function renderNowPlaying(
  s: ResolvedMediaSession,
  c: NormalizedMediaDeckConfig,
  action: (intent: MediaIntent) => void,
  lookup?: ArtworkResult,
  failedArtwork: Set<string> = new Set(),
  onImageError: (url: string) => void = () => {},
): TemplateResult {
  const m = s.metadata ?? s.active ?? s.primary;
  const picture = m?.attributes.entity_picture as string | undefined;
  const homeArt = picture && !failedArtwork.has(picture) ? picture : undefined;
  const external = c.artwork?.provider && c.artwork.provider !== 'home-assistant';
  const art = external
    ? ((lookup?.url && !failedArtwork.has(lookup.url) ? lookup.url : undefined) ??
      (c.artwork?.fallback !== false ? homeArt : undefined))
    : homeArt;
  const app = appName(
    m?.attributes.app_name ?? m?.attributes.app_id ?? s.remote?.attributes.current_activity,
    c.app_names,
  );
  const title = appName(
    (m?.attributes.media_title ??
      (app || undefined) ??
      m?.attributes.friendly_name ??
      c.title ??
      'MediaDeck') as string,
    c.app_names,
  );
  const sub = appName(
    (m?.attributes.media_artist ??
      m?.attributes.media_series_title ??
      m?.attributes.app_name ??
      s.mappedLabel ??
      s.source ??
      '') as string,
    c.app_names,
  );
  const duration = Number(m?.attributes.media_duration ?? 0);
  const position = mediaPosition(m);
  const progress = duration > 0 ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0;
  const seekable = duration > 0 && s.capabilities.seek && Boolean(s.transport);

  return html`<section class="now-playing">
    <div class="artwork ${art ? '' : 'placeholder'}">
      ${art
        ? html`<img src=${art} alt="" @error=${() => onImageError(art)} />`
        : html`<span>${app || 'MEDIA'}</span>`}
    </div>
    <div class="media-copy">
      <div class="eyebrow">
        ${s.adapter.name}${s.source ? html` · ${appName(s.source, c.app_names)}` : nothing}
      </div>
      <h2>${title}</h2>
      ${sub && sub !== title ? html`<p>${sub}</p>` : nothing}
      <div class="state-line"><span class="state-dot"></span>${s.state}</div>
      ${seekable
        ? html`<input
            class="seek"
            aria-label="Seek"
            type="range"
            min="0"
            max=${String(duration)}
            step="1"
            .value=${String(position)}
            @change=${(event: Event) =>
              action({
                kind: 'seek',
                position: Number((event.target as HTMLInputElement).value),
              })}
          />`
        : duration > 0
          ? html`<div class="progress"><span style=${`width:${progress}%`}></span></div>`
          : nothing}
      ${external && lookup?.message
        ? html`<small class="artwork-status">${lookup.message}</small>`
        : nothing}
      ${lookup?.url && lookup.url === art && lookup.provider
        ? html`<small class="artwork-credit"
            >Artwork:
            <a
              href=${lookup.provider === 'Fanart.tv'
                ? 'https://fanart.tv/'
                : 'https://www.themoviedb.org/'}
              target="_blank"
              rel="noopener noreferrer"
              >${lookup.provider}</a
            ></small
          >`
        : nothing}
      ${external && c.artwork?.tmdb_api_key
        ? html`<details class="artwork-credit">
            <summary>Metadata credits</summary>
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"
              ><img
                class="tmdb-logo"
                alt="TMDB"
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg"
            /></a>
            <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          </details>`
        : nothing}
    </div>
  </section>`;
}
