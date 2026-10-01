import { html, nothing, type TemplateResult } from 'lit';
import type { ResolvedMediaSession } from '../session/types';
import type { MediaIntent } from '../actions/types';
export function renderAudioControls(
  s: ResolvedMediaSession,
  a: (i: MediaIntent) => void,
): TemplateResult | typeof nothing {
  const c = s.capabilities;
  if (!s.audio || (!c.volumeSet && !c.volumeStep && !c.mute)) return nothing;
  const v = Number(s.audio.attributes.volume_level ?? 0),
    m = Boolean(s.audio.attributes.is_volume_muted);
  return html`<section class="audio-panel">
    <div class="section-title">
      Audio <small>${s.audio.attributes.friendly_name ?? s.audio.entity_id}</small>
    </div>
    <div class="audio-row">
      ${c.mute
        ? html`<button @click=${() => a({ kind: 'mute', muted: !m })}>
            ${m ? 'Unmute' : 'Mute'}
          </button>`
        : ''}${c.volumeStep
        ? html`<button @click=${() => a({ kind: 'volume-down' })}>−</button>`
        : ''}${c.volumeSet
        ? html`<input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            .value=${String(v)}
            @change=${(e: Event) =>
              a({ kind: 'volume-set', volume: Number((e.target as HTMLInputElement).value) })}
          />`
        : ''}${c.volumeStep
        ? html`<button @click=${() => a({ kind: 'volume-up' })}>+</button>`
        : ''}
    </div>
  </section>`;
}
