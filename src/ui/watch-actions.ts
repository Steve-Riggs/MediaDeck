import { html, nothing, type TemplateResult } from 'lit';
import type { NormalizedMediaDeckConfig } from '../config/types';
import type { MediaIntent } from '../actions/types';
export function renderWatchActions(
  c: NormalizedMediaDeckConfig,
  a: (i: MediaIntent) => void,
): TemplateResult | typeof nothing {
  if (!c.watch_actions.length) return nothing;
  return html`<section class="watch-actions">
    <div class="section-title">Watch</div>
    <div class="chip-row">
      ${c.watch_actions.map(
        (i) =>
          html`<button @click=${() => a({ kind: 'custom', action: i.action })}>${i.name}</button>`,
      )}
    </div>
  </section>`;
}
