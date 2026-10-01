import { html, type TemplateResult } from 'lit';
import { DEFAULT_SECTION_ORDER } from '../config/defaults';
import type { MediaDeckConfig, RegionName } from '../config/types';

export function toggleRegion(
  config: MediaDeckConfig,
  region: RegionName,
  visible: boolean,
): MediaDeckConfig {
  return { ...config, regions: { ...(config.regions ?? {}), [region]: visible } };
}

export function moveRegion(
  config: MediaDeckConfig,
  region: RegionName,
  direction: -1 | 1,
): MediaDeckConfig {
  const order = [...(config.section_order ?? DEFAULT_SECTION_ORDER)];
  const index = order.indexOf(region);
  if (index < 0) return { ...config, section_order: order };
  const target = Math.max(0, Math.min(order.length - 1, index + direction));
  if (target !== index) [order[index], order[target]] = [order[target], order[index]];
  return { ...config, section_order: order };
}

export function renderLayoutSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const order = config.section_order ?? DEFAULT_SECTION_ORDER;
  return html`<section>
    <h3>Layout</h3>
    <div class="layout-list">
      ${order.map(
        (region, index) => html`<div class="layout-row">
          <label>
            <input
              type="checkbox"
              .checked=${config.regions?.[region] ?? region !== 'inspector'}
              @change=${(event: Event) =>
                replace(toggleRegion(config, region, (event.target as HTMLInputElement).checked))}
            />
            ${region.replaceAll('_', ' ')}
          </label>
          <button ?disabled=${index === 0} @click=${() => replace(moveRegion(config, region, -1))}>
            ↑
          </button>
          <button
            ?disabled=${index === order.length - 1}
            @click=${() => replace(moveRegion(config, region, 1))}
          >
            ↓
          </button>
        </div>`,
      )}
    </div>
  </section>`;
}
