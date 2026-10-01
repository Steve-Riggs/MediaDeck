import { html, nothing, type TemplateResult } from 'lit';
import type { ResolvedMediaSession } from '../session/types';
import type { NormalizedMediaDeckConfig } from '../config/types';
export function renderNowPlaying(
  s: ResolvedMediaSession,
  c: NormalizedMediaDeckConfig,
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
  const d = Number(m?.attributes.media_duration ?? 0),
    p = Number(m?.attributes.media_position ?? 0),
    progress = d > 0 ? Math.max(0, Math.min(100, (p / d) * 100)) : 0;
  return html`<section class="now-playing">
    <div class="artwork ${art ? '' : 'placeholder'}">
      ${art ? html`<img src=${art} alt="" />` : html`<span>MEDIA</span>`}
    </div>
    <div class="media-copy">
      <div class="eyebrow">${s.adapter.name}${s.source ? html` · ${s.source}` : nothing}</div>
      <h2>${title}</h2>
      ${sub ? html`<p>${sub}</p>` : nothing}
      <div class="state-line"><span class="state-dot"></span>${s.state}</div>
      ${d > 0
        ? html`<div class="progress"><span style=${`width:${progress}%`}></span></div>`
        : nothing}
    </div>
  </section>`;
}
