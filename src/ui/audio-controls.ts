import { html, nothing, type TemplateResult } from 'lit';
import type { ResolvedMediaSession } from '../session/types';
import type { MediaIntent } from '../actions/types';

export function renderAudioControls(
  s: ResolvedMediaSession,
  action: (intent: MediaIntent) => void,
  volumeDraft: number | undefined,
  setVolumeDraft: (value: number | undefined) => void,
): TemplateResult | typeof nothing {
  const c = s.capabilities;
  if (!s.audio || (!c.volumeSet && !c.volumeStep && !c.mute)) return nothing;
  const volume = Number(s.audio.attributes.volume_level ?? 0);
  const muted = Boolean(s.audio.attributes.is_volume_muted);
  const displayedVolume = volumeDraft ?? volume;

  return html`<section class="audio-panel">
    <div class="section-title">
      Audio <small>${s.audio.attributes.friendly_name ?? s.audio.entity_id}</small>
    </div>
    <div class="audio-row">
      ${c.mute
        ? html`<button @click=${() => action({ kind: 'mute', muted: !muted })}>
            ${muted ? 'Unmute' : 'Mute'}
          </button>`
        : nothing}
      ${c.volumeStep
        ? html`<button @click=${() => action({ kind: 'volume-down' })}>−</button>`
        : nothing}
      ${c.volumeSet
        ? html`<input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            .value=${String(displayedVolume)}
            @input=${(event: Event) =>
              setVolumeDraft(Number((event.target as HTMLInputElement).value))}
            @change=${(event: Event) => {
              const next = Number((event.target as HTMLInputElement).value);
              action({ kind: 'volume-set', volume: next });
              setVolumeDraft(undefined);
            }}
          />`
        : nothing}
      ${c.volumeStep
        ? html`<button @click=${() => action({ kind: 'volume-up' })}>+</button>`
        : nothing}
    </div>
  </section>`;
}
