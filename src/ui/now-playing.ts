import { html, nothing, type TemplateResult } from 'lit';
import type { MediaIntent } from '../actions/types';
import type { ResolvedMediaSession } from '../session/types';
import type { NormalizedMediaDeckConfig } from '../config/types';

function mediaPosition(entity: ResolvedMediaSession['metadata']): number {
  if (!entity) return 0;
  let position = Number(entity.attributes.media_position ?? 0);
  if (entity.state === 'playing' && typeof entity.attributes.media_position_updated_at === 'string') {
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
): TemplateResult {
  const m = s.metadata ?? s.active ?? s.primary;
  const art = m?.attributes.entity_picture as string | undefined;
  const title = (m?.attributes.media_title ??
    m?.attributes.friendly_name ??
    c.title ??
    'MediaDeck') as string;
  const sub = (m?.attributes.media_artist ??
    m?.attributes.media_series_title ??
    m?.attributes.app_name ??
    s.mappedLabel ??
    s.source ??
    '') as string;
  const duration = Number(m?.attributes.media_duration ?? 0);
  const position = mediaPosition(m);
  const progress = duration > 0 ? Math.max(0, Math.min(100, (position / duration) * 100)) : 0;
  const seekable = duration > 0 && s.capabilities.seek && Boolean(s.transport);

  return html`<section class="now-playing">
    <div class="artwork ${art ? '' : 'placeholder'}">
      ${art ? html`<img src=${art} alt="" />` : html`<span>MEDIA</span>`}
    </div>
    <div class="media-copy">
      <div class="eyebrow">${s.adapter.name}${s.source ? html` · ${s.source}` : nothing}</div>
      <h2>${title}</h2>
      ${sub ? html`<p>${sub}</p>` : nothing}
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
    </div>
  </section>`;
}
