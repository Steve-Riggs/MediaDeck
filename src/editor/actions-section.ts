import { html, type TemplateResult } from 'lit';
import type { MediaDeckConfig, WatchAction } from '../config/types';

export function addWatchAction(config: MediaDeckConfig, action: WatchAction): MediaDeckConfig {
  return { ...config, watch_actions: [...(config.watch_actions ?? []), action] };
}

export function removeWatchAction(config: MediaDeckConfig, index: number): MediaDeckConfig {
  return {
    ...config,
    watch_actions: (config.watch_actions ?? []).filter((_, itemIndex) => itemIndex !== index),
  };
}

export function renderActionsSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const actions = config.watch_actions ?? [];
  const update = (index: number, next: WatchAction) => {
    const copy = [...actions];
    copy[index] = next;
    replace({ ...config, watch_actions: copy });
  };

  return html`<section>
    <h3>Watch actions</h3>
    <p class="hint">Use Home Assistant scripts for multi-device sequences.</p>
    ${actions.map(
      (item, index) => html`<div class="action-row">
        <input
          aria-label=${`Watch action ${index + 1} name`}
          placeholder="Name"
          .value=${item.name}
          @change=${(event: Event) =>
            update(index, { ...item, name: (event.target as HTMLInputElement).value })}
        />
        <input
          aria-label=${`Watch action ${index + 1} service`}
          placeholder="script.watch_tv"
          .value=${item.action.service}
          @change=${(event: Event) =>
            update(index, {
              ...item,
              action: { ...item.action, service: (event.target as HTMLInputElement).value },
            })}
        />
        <button @click=${() => replace(removeWatchAction(config, index))}>Remove</button>
      </div>`,
    )}
    <button
      @click=${() =>
        replace(
          addWatchAction(config, {
            name: 'Watch',
            action: { action: 'call-service', service: 'script.turn_on' },
          }),
        )}
    >
      Add Watch action
    </button>
  </section>`;
}
