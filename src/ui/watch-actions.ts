import { html, nothing, type TemplateResult } from 'lit';
import type { NormalizedMediaDeckConfig } from '../config/types';
import type { MediaIntent } from '../actions/types';

export function renderWatchActions(
  config: NormalizedMediaDeckConfig,
  action: (intent: MediaIntent) => void,
): TemplateResult | typeof nothing {
  const custom = Object.entries(config.custom_actions);
  if (!config.watch_actions.length && !custom.length) return nothing;

  return html`<section class="watch-actions">
    <div class="section-title">Actions</div>
    <div class="chip-row">
      ${config.watch_actions.map(
        (item) =>
          html`<button @click=${() => action({ kind: 'custom', action: item.action })}>
            ${item.name}
          </button>`,
      )}
      ${custom.map(
        ([name, configured]) =>
          html`<button @click=${() => action({ kind: 'custom', action: configured })}>
            ${name}
          </button>`,
      )}
    </div>
  </section>`;
}
